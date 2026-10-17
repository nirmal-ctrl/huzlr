// d3-force-3d does not ship declarations. This is the collision-force API used
// by the 2D canvas renderer; initialize follows the engine's dimensions contract.
declare module "d3-force-3d" {
  interface CollisionForce<NodeDatum> {
    (alpha: number): void
    initialize(nodes: NodeDatum[], dimensions?: number, random?: () => number): void
    radius(): (node: NodeDatum) => number
    radius(radius: number | ((node: NodeDatum) => number)): this
    iterations(): number
    iterations(count: number): this
  }
  export function forceCollide<NodeDatum>(radius?: number | ((node: NodeDatum) => number)): CollisionForce<NodeDatum>
}
