declare namespace CDP {
  namespace DOM {
    interface Node {
      nodeId: number;
      backendNodeId: number;
      nodeType: number;
      nodeName: string;
      localName?: string;
      nodeValue?: string;
      childNodeCount?: number;
      children?: Node[];
      attributes?: string[];
      documentURL?: string;
      baseURL?: string;
      publicId?: string;
      systemId?: string;
      internalSubset?: string;
      xmlVersion?: string;
      name?: string;
      value?: string;
      pseudoType?: string;
      shadowRootType?: string;
      frameId?: string;
      contentDocument?: Node;
      shadowRoots?: Node[];
      templateContent?: Node;
      pseudoElements?: Node[];
      importedDocument?: Node;
      distributedNodes?: unknown[];
      isSVG?: boolean;
    }
    
    interface BoxModel {
      content: number[];
      padding: number[];
      border: number[];
      margin: number[];
      width: number;
      height: number;
    }
  }
  
  namespace Accessibility {
    interface AXNode {
      nodeId: string;
      ignored: boolean;
      ignoredReasons?: unknown[];
      role?: { type: string; value: string };
      name?: { type: string; value: string };
      description?: { type: string; value: string };
      value?: { type: string; value: string };
      properties?: { name: string; value: { type: string; value: unknown } }[];
      childIds?: string[];
      backendDOMNodeId?: number;
    }
  }
}
