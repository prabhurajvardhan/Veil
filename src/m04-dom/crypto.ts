export async function generateTargetId(xpath: string, backendNodeId: number): Promise<string> {
  const input = `${xpath}|${backendNodeId}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback if crypto is unavailable
  return input;
}
