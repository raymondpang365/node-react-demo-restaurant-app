/* @flow */

import loadable from 'loadable-components';

import { ErrorDisplay, Loading } from '../../components/index';

export default loadable(() => import('./MatchList'), {
  ErrorComponent: ErrorDisplay,
  LoadingComponent: Loading
});
