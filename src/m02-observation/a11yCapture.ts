/**
 * M02: Observation Manager — Accessibility Tree Capture Engine (T004)
 * Author: AI002 (Browser Observation Engineer)
 * Authority: MODULES.md (M02), INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md
 */

import { CDPSession } from './cdpSession';
import { A11yCaptureError, CDPGetFullAXTreeResult } from './types';

/**
 * Validates that an object satisfies minimal structural constraints of CDP.Accessibility.AXNode.
 */
function isValidAXNode(node: unknown): node is CDP.Accessibility.AXNode {
  if (!node || typeof node !== 'object') {
    return false;
  }
  const candidate = node as Record<string, unknown>;
  return typeof candidate.nodeId === 'string' && typeof candidate.ignored === 'boolean';
}

/**
 * Captures the complete raw Chrome DevTools Protocol Accessibility Tree using Accessibility.getFullAXTree.
 * Preserves the un-mutated, un-interpreted raw AXNode hierarchy.
 * 
 * Fails closed if session is detached, CDP command fails, or the returned
 * payload fails structural validation.
 * 
 * @param session Active CDPSession attached to the target tab
 * @returns Array of raw CDP.Accessibility.AXNode items
 */
export async function captureA11yTree(
  session: CDPSession
): Promise<CDP.Accessibility.AXNode[]> {
  if (!session.isAttached()) {
    throw new A11yCaptureError('Cannot capture Accessibility tree: CDPSession is not attached to target tab');
  }

  let result: CDPGetFullAXTreeResult;
  try {
    result = await session.sendCommand<CDPGetFullAXTreeResult>(
      'Accessibility.getFullAXTree',
      {}
    );
  } catch (error) {
    if (error instanceof A11yCaptureError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new A11yCaptureError(`Accessibility.getFullAXTree execution failed: ${message}`, error);
  }

  if (!result || typeof result !== 'object') {
    throw new A11yCaptureError('Invalid Accessibility.getFullAXTree response: payload is null or not an object');
  }

  if (!Array.isArray(result.nodes)) {
    throw new A11yCaptureError(
      'Invalid Accessibility.getFullAXTree response: nodes array is missing or invalid',
      result
    );
  }

  for (let i = 0; i < result.nodes.length; i++) {
    const node = result.nodes[i];
    if (!isValidAXNode(node)) {
      throw new A11yCaptureError(
        `Invalid Accessibility.getFullAXTree response: malformed AXNode at index ${i}`,
        node
      );
    }
  }

  return result.nodes;
}
