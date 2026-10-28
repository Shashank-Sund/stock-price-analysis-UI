/**
 * Real backend responses (HTTP bodies: the Lambda envelope with a JSON string body),
 * copied from docker-lambda-aws3/docs/fixtures/ into mock-api/fixtures/backend/.
 */
import single1y from '../../mock-api/fixtures/backend/single-1y.json';
import single5y from '../../mock-api/fixtures/backend/single-5y.json';
import single10y from '../../mock-api/fixtures/backend/single-10y.json';
import short1m from '../../mock-api/fixtures/backend/short-1m.json';
import multi3 from '../../mock-api/fixtures/backend/multi-3.json';
import withSpy from '../../mock-api/fixtures/backend/with-spy.json';
import max10x20y from '../../mock-api/fixtures/backend/max-10x20y.json';
import unknown from '../../mock-api/fixtures/backend/error-unknown.json';
import type { AnalysisResponse } from '@/lib/types';

export const ENVELOPES = { single1y, single5y, single10y, short1m, multi3, withSpy, max10x20y, unknown };

/** The HTTP text the API returns for a fixture. */
export const httpText = (env: { body: string }) => JSON.stringify(env);

/** The decoded success body of a fixture. */
export const data = (env: { body: string }) => JSON.parse(env.body) as AnalysisResponse;

export const SINGLE = data(single1y);
export const SINGLE_5Y = data(single5y);
export const WEEKLY = data(single10y);
export const SHORT = data(short1m);
export const MULTI = data(multi3);
export const WITH_SPY = data(withSpy);
export const MAX = data(max10x20y);
