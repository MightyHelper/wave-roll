declare module '@/web-component' {
  export class WaveRollElement extends HTMLElement {
    hasAttribute(qualifiedName: string): boolean {
      return true;
    }
  }
}


