import {AppRegistry} from 'react-native';
import {TestifyApp} from '@samsara-dev/react-native-testify';
import registry from './testify/registry';
import {name as appName} from './app.json';

const App = () => <TestifyApp registry={registry} />;

AppRegistry.registerComponent(appName, () => App);
