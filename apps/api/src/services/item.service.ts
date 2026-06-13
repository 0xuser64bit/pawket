import { ItemType } from '@pawket/shared';
export class ItemService {
  async listItems() {
    return [
      {
        id: 'season-one-pass',
        sku: 'season-one-pass',
        name: 'Season One Pass',
        type: ItemType.EventPass,
        price: 'TBD',
      },
    ];
  }
}
