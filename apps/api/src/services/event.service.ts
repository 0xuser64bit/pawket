export class EventService {
  async listEvents() {
    return [
      {
        slug: 'season-one',
        name: 'Season One',
        status: 'planned',
        copy: 'Earn memories, not just points.',
      },
    ];
  }
}
