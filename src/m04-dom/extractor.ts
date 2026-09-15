import { CDPSession } from '../m02-observation/cdpSession';
import { RawObservation } from '../m02-observation/types';
import { BoundingBox, DomElementEvidence, DomEvidence, DomGroundingError } from './types';
import { generateTargetId } from './crypto';

interface GetBoxModelResult {
  model: CDP.DOM.BoxModel;
}

export async function extractDomEvidence(
  session: CDPSession,
  rawObs: RawObservation
): Promise<DomEvidence> {
  const domTree = rawObs.dom_tree as CDP.DOM.Node | undefined;
  const a11yTree = rawObs.a11y_tree as CDP.Accessibility.AXNode[] | undefined;

  if (!domTree) {
    throw new DomGroundingError('Missing DOM tree in RawObservation');
  }

  const elements: DomElementEvidence[] = [];

  const a11yMap = new Map<number, CDP.Accessibility.AXNode>();
  if (a11yTree) {
    for (const axNode of a11yTree) {
      if (axNode.backendDOMNodeId !== undefined) {
        a11yMap.set(axNode.backendDOMNodeId, axNode);
      }
    }
  }

  async function traverse(node: CDP.DOM.Node, path: string) {
    if (node.nodeType === 1) {
      const localName = (node.localName || node.nodeName).toLowerCase();
      const xpath = path ? `${path}/${localName}` : `/${localName}`;
      
      const axNode = a11yMap.get(node.backendNodeId);
      
      let interactable = false;
      let role = 'generic';
      let text: string | undefined = undefined;
      let isVisible = true;
      
      if (axNode) {
        if (axNode.ignored) {
          isVisible = false;
        } else {
          role = axNode.role?.value || role;
          text = axNode.name?.value || undefined;
          
          const focusableProp = axNode.properties?.find(p => p.name === 'focusable');
          if (focusableProp && focusableProp.value.value === true) {
            interactable = true;
          }
          
          const interactableRoles = ['button', 'link', 'textbox', 'searchbox', 'checkbox', 'radio', 'switch', 'menuitem', 'option', 'slider', 'spinbutton'];
          if (interactableRoles.includes(role)) {
            interactable = true;
          }
        }
      } else {
         const interactableNames = ['button', 'a', 'input', 'select', 'textarea'];
         if (interactableNames.includes(localName)) {
           interactable = true;
         }
      }

      if (isVisible) {
        let bbox: BoundingBox | null = null;
        try {
          const res = await session.sendCommand<GetBoxModelResult>('DOM.getBoxModel', {
            backendNodeId: node.backendNodeId
          });
          if (res?.model?.content && res.model.content.length >= 8) {
             const x = Math.min(res.model.content[0], res.model.content[6]);
             const y = Math.min(res.model.content[1], res.model.content[3]);
             bbox = {
               x,
               y,
               width: res.model.width,
               height: res.model.height
             };
          }
        } catch (err) {
          // Ignored: element not in layout tree
        }
        
        if (bbox && (bbox.width > 0 && bbox.height > 0)) {
          const target_id = await generateTargetId(xpath, node.backendNodeId);
          elements.push({
            target_id,
            bbox,
            role,
            text,
            interactable
          });
        }
      }
      
      if (node.children) {
        const nameCount = new Map<string, number>();
        for (const child of node.children) {
          if (child.nodeType === 1) {
            const cLocalName = (child.localName || child.nodeName).toLowerCase();
            const count = (nameCount.get(cLocalName) || 0) + 1;
            nameCount.set(cLocalName, count);
            const childPath = `${xpath}[${count}]`;
            await traverse(child, childPath);
          } else {
            await traverse(child, xpath);
          }
        }
      }
    } else {
       if (node.children) {
         for (const child of node.children) {
           await traverse(child, path);
         }
       }
    }
  }

  await traverse(domTree, '');

  return {
    source: 'CDP',
    elements
  };
}
