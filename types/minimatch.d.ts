// Type stub for minimatch to resolve build issues
declare module "minimatch" {
  export interface MinimatchOptions {
    nobrace?: boolean;
    nocomment?: boolean;
    nocase?: boolean;
    nonegate?: boolean;
    noglobstar?: boolean;
    noext?: boolean;
    dot?: boolean;
    matchBase?: boolean;
    flipNegate?: boolean;
  }

  export function minimatch(
    target: string,
    pattern: string,
    options?: MinimatchOptions
  ): boolean;

  export class Minimatch {
    constructor(pattern: string, options?: MinimatchOptions);
    match(target: string): boolean;
  }

  export default minimatch;
}
