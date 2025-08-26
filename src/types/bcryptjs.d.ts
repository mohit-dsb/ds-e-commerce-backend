// Type declaration for bcryptjs module
declare module "bcryptjs" {
  export function hash(data: string | Buffer, rounds: number): Promise<string>;
  export function hashSync(data: string | Buffer, rounds: number): string;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function compareSync(data: string | Buffer, encrypted: string): boolean;
  export function getRounds(encrypted: string): number;
  export function getSalt(encrypted: string): string;
  
  export default {
    hash,
    hashSync,
    compare,
    compareSync,
    getRounds,
    getSalt
  };
}