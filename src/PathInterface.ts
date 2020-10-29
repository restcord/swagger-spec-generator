import ParameterInterface from './ParameterInterface';

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'LINK';

export default interface PathInterface {
    category: string;
    name: string;
    method: HttpMethod;
    route: string;
    description?: string;
    parameters?: ParameterInterface[];
    skip: boolean;
}
