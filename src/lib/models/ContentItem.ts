import { PersistedBaseObject } from '@quatrain/backend';
import { StringProperty, ArrayProperty, DateTimeProperty } from '@quatrain/core';

export const ContentItemProperties = [
   {
      name: 'id',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'soa',
      type: StringProperty.TYPE,
      mandatory: false,
      defaultValue: 'bradtech/world-agronomy'
   },
   {
      name: 'revision',
      type: StringProperty.TYPE,
      mandatory: false,
      defaultValue: 'rev-1.0.0'
   },
   {
      name: 'documentDate',
      type: DateTimeProperty.TYPE,
      mandatory: false
   },
   {
      name: 'title',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'type',
      type: StringProperty.TYPE,
      mandatory: false,
      defaultValue: 'document'
   },
   {
      name: 'category',
      type: StringProperty.TYPE,
      mandatory: false,
      defaultValue: 'inbox'
   },
   {
      name: 'tags',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'thematics',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'soils',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'climates',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'latitudes',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'altitudes',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'itineraries',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'crops',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'properNouns',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'links',
      type: ArrayProperty.TYPE,
      itemType: StringProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'backlinks',
      type: ArrayProperty.TYPE,
      mandatory: false,
      defaultValue: []
   },
   {
      name: 'summary',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'description',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'originalFileUri',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'fileHash',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'source',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'markdownFileUri',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'createdAt',
      type: StringProperty.TYPE,
      mandatory: false
   },
   {
      name: 'body',
      type: StringProperty.TYPE,
      mandatory: false
   }
];

export class ContentItem extends PersistedBaseObject {
   static PROPS_DEFINITION = ContentItemProperties;
   static COLLECTION = 'content';
}
