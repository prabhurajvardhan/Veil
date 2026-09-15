export type AgentState = 
  | 'IDLE' 
  | 'OBSERVING' 
  | 'AUTHORIZING' 
  | 'REASONING' 
  | 'EXECUTING' 
  | 'VERIFYING' 
  | 'RECOVERY' 
  | 'COMPLETED' 
  | 'ABORTED';

export class OrchestratorStateMachine {
  private currentState: AgentState = 'IDLE';
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 3;

  public getState(): AgentState {
    return this.currentState;
  }

  public transition(newState: AgentState): void {
    if (this.isValidTransition(this.currentState, newState)) {
      console.log(`[VEIL Orchestrator] Transitioning from ${this.currentState} to ${newState}`);
      this.currentState = newState;
    } else {
      console.error(`[VEIL Orchestrator] Invalid state transition from ${this.currentState} to ${newState}`);
      this.abort();
    }
  }

  private isValidTransition(from: AgentState, to: AgentState): boolean {
    if (to === 'ABORTED' || to === 'RECOVERY') {
      return true; // Can abort or recover from any active state
    }
    
    switch (from) {
      case 'IDLE':
        return to === 'OBSERVING';
      case 'OBSERVING':
        return to === 'AUTHORIZING';
      case 'AUTHORIZING':
        return to === 'REASONING';
      case 'REASONING':
        return to === 'EXECUTING';
      case 'EXECUTING':
        return to === 'VERIFYING';
      case 'VERIFYING':
        return to === 'COMPLETED' || to === 'OBSERVING';
      case 'RECOVERY':
        return to === 'OBSERVING' || to === 'IDLE';
      case 'COMPLETED':
      case 'ABORTED':
        return to === 'IDLE';
      default:
        return false;
    }
  }

  public registerFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.MAX_FAILURES) {
      console.error(`[VEIL Orchestrator] Max failures (${this.MAX_FAILURES}) reached. Aborting.`);
      this.transition('ABORTED');
    } else {
      this.transition('RECOVERY');
    }
  }

  public resetFailures(): void {
    this.consecutiveFailures = 0;
  }

  public abort(): void {
    console.error(`[VEIL Orchestrator] Aborting execution.`);
    this.currentState = 'ABORTED';
  }
}
