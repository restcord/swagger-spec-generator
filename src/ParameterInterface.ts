export type ParameterLocation = 'path' | 'query' | 'header' | 'form' | 'body' | 'unknown'

export default interface ParameterInterface {
    location: ParameterLocation,
    name: string;
    type: string;
    default: any;
    required: boolean;
}
