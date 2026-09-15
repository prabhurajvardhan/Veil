import { extractDomEvidence } from '../extractor';
import { generateTargetId } from '../crypto';
import { DomGroundingError } from '../types';

// Minimal mock CDPSession
class MockCDPSession {
  public boxModels = new Map<number, any>();

  public async sendCommand<T>(method: string, params?: any): Promise<T> {
    if (method === 'DOM.getBoxModel') {
      const model = this.boxModels.get(params.backendNodeId);
      if (!model) {
        throw new Error('Could not compute box model.');
      }
      return { model } as unknown as T;
    }
    throw new Error(`Unknown command ${method}`);
  }
}

export async function runExtractorTests() {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(error);
      failed++;
    }
  }

  console.log('\n[Suite: DOM Evidence Extraction (M04)]');

  await test('extractDomEvidence extracts correct bounding boxes and interactability', async () => {
    const session = new MockCDPSession();
    session.boxModels.set(100, {
      content: [10, 10, 110, 10, 110, 30, 10, 30],
      width: 100,
      height: 20
    });
    session.boxModels.set(101, {
      content: [20, 20, 120, 20, 120, 40, 20, 40],
      width: 100,
      height: 20
    });

    const rawObs: any = {
      dom_tree: {
        nodeType: 1,
        localName: 'html',
        backendNodeId: 1,
        children: [
          {
            nodeType: 1,
            localName: 'body',
            backendNodeId: 2,
            children: [
              {
                nodeType: 1,
                localName: 'button',
                backendNodeId: 100,
                children: []
              },
              {
                nodeType: 1,
                localName: 'div',
                backendNodeId: 101,
                children: []
              }
            ]
          }
        ]
      },
      a11y_tree: [
        {
          backendDOMNodeId: 100,
          ignored: false,
          role: { value: 'button' },
          name: { value: 'Submit' }
        },
        {
          backendDOMNodeId: 101,
          ignored: true // Should not be extracted
        }
      ]
    };

    const evidence = await extractDomEvidence(session as any, rawObs);
    
    if (evidence.elements.length !== 1) {
      throw new Error(`Expected 1 element, got ${evidence.elements.length}`);
    }

    const btn = evidence.elements[0];
    if (btn.role !== 'button') throw new Error('Role mismatch');
    if (btn.text !== 'Submit') throw new Error('Text mismatch');
    if (!btn.interactable) throw new Error('Interactability mismatch');
    if (btn.bbox.width !== 100) throw new Error('Width mismatch');
  });

  await test('extractDomEvidence fails closed on missing DOM tree', async () => {
    const session = new MockCDPSession();
    try {
      await extractDomEvidence(session as any, {} as any);
      throw new Error('Should have thrown DomGroundingError');
    } catch (e: any) {
      if (e.name !== 'DomGroundingError') throw e;
    }
  });

  await test('generateTargetId is deterministic', async () => {
    const id1 = await generateTargetId('/html/body/div[1]', 100);
    const id2 = await generateTargetId('/html/body/div[1]', 100);
    if (id1 !== id2) throw new Error('Generated IDs do not match');
    if (id1 === '/html/body/div[1]|100' && typeof crypto !== 'undefined') {
      // It should hash
    }
  });

  return { passed, failed, total: passed + failed };
}
