import { lazy } from 'react';

/** Starts loading the dashboard chunk; safe to call many times. */
export const loadDashboard = () => import('./Dashboard');

export const LazyDashboard = lazy(loadDashboard);
