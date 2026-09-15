/**
 * M02: Observation Manager — Raw DOM Tree Capture Engine (T004)
 * Author: AI002 (Browser Observation Engineer)
 * Authority: MODULES.md (M02), INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md
 */

import { CDPSession } from './cdpSession';
import { CDP, CDPGetDocumentResult, DOMCaptureError, DOMCaptureOptions } from './types';

/**
 * Validates that a node has the minimal structural properties of a CDP.DOM.Node.
 */
function isValidCDPDOMNode(node: unknown): node is CDP.DOM.Node {
  if (!node || typeof node !== 'object') {
    return false;
  }
  const candidate = node as Record<string, unknown>;
  return (
    typeof candidate.nodeId === 'number' &&
    typeof candidate.nodeName === 'string' &&
    typeof candidate.nodeType === 'number'
  );
}

/**
 * Captures the complete raw Chrome DevTools Protocol DOM tree using DOM.getDocument.
 * Enforces depth: -1 and pierce: true to capture Shadow DOM hierarchies.
 * 
 * Fails closed if session is detached, CDP command fails, or the returned
 * root node fails structural validation.
 * 
 * @param session Active CDPSession attached to the target tab
 * @param options Optional overrides (depth defaults to -1, pierce defaults to true)
 * @returns Complete raw CDP.DOM.Node root tree
 */
export async function captureDOMTree(
  session: CDPSession,
  options?: DOMCaptureOptions
): Promise<CDP.DOM.Node> {
  if (!session.isAttached()) {
    throw new DOMCaptureError('Cannot capture DOM tree: CDPSession is not attached to target tab');
  }

  const depth = typeof options?.depth === 'number' ? options.depth : -1;
  const pierce = typeof options?.pierce === 'boolean' ? options.pierce : true;

  let result: CDPGetDocumentResult;
  try {
    result = await session.sendCommand<CDPGetDocumentResult>('DOM.getDocument', {
      depth,
      pierce,
    });
  } catch (error) {
    if (error instanceof DOMCaptureError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new DOMCaptureError(`DOM.getDocument execution failed: ${message}`, error);
  }

  if (!result || typeof result !== 'object') {
    throw new DOMCaptureError('Invalid DOM.getDocument response: payload is null or not an object');
  }

  if (!result.root || !isValidCDPDOMNode(result.root)) {
    throw new DOMCaptureError(
      'Invalid DOM.getDocument response: missing or malformed root DOM node',
      result
    );
  }

  return result.root;
}
