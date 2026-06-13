export class JupiterService {
  constructor(private readonly baseUrl: string) {}
  async quote() {
    throw new Error(
      `Jupiter integration is not wired yet. Configure and implement quote calls against ${this.baseUrl}.`,
    );
  }
}
