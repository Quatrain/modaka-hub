import { PersistedBaseObject } from '@quatrain/backend';
import { StringProperty, ArrayProperty, IntegerProperty } from '@quatrain/core';

export const ThematicItemProperties = [
   {
      name: 'id',
      type: StringProperty.TYPE,
      mandatory: true
   },
   {
      name: 'title',
      type: StringProperty.TYPE,
      mandatory: true
   },
   {
      name: 'description',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'parent',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'tags',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'order',
      type: IntegerProperty.TYPE,
      mandatory: false,
      defaultValue: 0
   }
];

export class ThematicItem extends PersistedBaseObject {
   static PROPS_DEFINITION = ThematicItemProperties;
   static COLLECTION = 'thematics';
}
