export type SF2eAncestry =
  | 'android'
  | 'astrazoan'
  | 'barathu'
  | 'brenneri'
  | 'dwarf'
  | 'elf'
  | 'gnome'
  | 'goblin'
  | 'halfling'
  | 'human'
  | 'kasatha'
  | 'lashunta'
  | 'maraquoi'
  | 'pahtra'
  | 'quorlu'
  | 'shirren'
  | 'skittermander'
  | 'stellifera'
  | 'vesk'
  | 'vlaka'
  | 'witchwyrd'
  | 'xenodruid'
  | 'ysoki'

export type PricingTendency = 'fair' | 'haggler' | 'overcharger' | 'discount' | 'gouger'

export interface GeneratedNPC {
  name: string
  ancestry: SF2eAncestry
  ancestryLabel: string
  disposition: string
  motivation: string
  quirk: string
  secret: string
  appearance: string
  pricingTendency: PricingTendency
  pricingLabel: string
  specialtyKnowledge: string
  shopRelationship: string
  flavorText: string
}
