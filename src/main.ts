import { Command, Helper, OptionsHelper } from '@dojo/cli/interfaces';
import { Argv } from 'yargs';
const webpack: any = require('webpack');
const WebpackDevServer: any = require('webpack-dev-server');
const config: any = require('./webpack.config');

interface BuildArgs extends Argv {
	locale: string;
	messageBundles: string | string[];
	supportedLocales: string | string[];
	watch: boolean;
	port: number;
	element: string;
	elementPrefix: string;
}

interface WebpackOptions {
	compress: boolean;
	stats: {
		colors: boolean
		chunks: boolean
	};
}

function getConfigArgs(args: BuildArgs): Partial<BuildArgs> {
	const { locale, messageBundles, supportedLocales, watch } = args;
	const options: Partial<BuildArgs> = Object.keys(args).reduce((options: Partial<BuildArgs>, key: string) => {
		if (key !== 'messageBundles' && key !== 'supportedLocales') {
			options[key] = args[key];
		}
		return options;
	}, Object.create(null));

	if (messageBundles) {
		options.messageBundles = Array.isArray(messageBundles) ? messageBundles : [ messageBundles ];
	}

	if (supportedLocales) {
		options.supportedLocales = Array.isArray(supportedLocales) ? supportedLocales : [ supportedLocales ];
	}

	if (args.element && !args.elementPrefix) {
		const factoryPattern = /create(.*?)Element.*?\.ts$/;
		const matches = args.element.match(factoryPattern);

		if (matches && matches[ 1 ]) {
			options.elementPrefix = matches[ 1 ].replace(/[A-Z][a-z]/g, '-\$&').replace(/^-+/g, '').toLowerCase();
		} else {
			console.error(`"${args.element}" does not follow the pattern "createXYZElement". Use --elementPrefix to name element.`);
			process.exit();
		}
	}

	return options;
}

function watch(config: any, options: WebpackOptions, args: BuildArgs): Promise<any> {
	config.devtool = 'inline-source-map';
	Object.keys(config.entry).forEach((key) => {
		config.entry[key].unshift('webpack-dev-server/client?');
	});

	const compiler = webpack(config);
	const server = new WebpackDevServer(compiler, options);

	return new Promise((resolve, reject) => {
		const port = args.port || 9999;
		server.listen(port, '127.0.0.1', (err: Error) => {
			console.log(`Starting server on http://localhost:${port}`);
			if (err) {
				reject(err);
				return;
			}
		});
	});
}

function compile(config: any, options: WebpackOptions): Promise<any> {
	const compiler = webpack(config);
	return new Promise((resolve, reject) => {
		compiler.run((err: any, stats: any) => {
			if (err) {
				reject(err);
				return;
			}
			console.log(stats.toString(options.stats));
			resolve({});
		});
	});
}

const command: Command = {
	description: 'create a build of your application',
	register(options: OptionsHelper): void {
		options('w', {
			alias: 'watch',
			describe: 'watch and serve'
		});

		options('p', {
			alias: 'port',
			describe: 'port to serve on when using --watch',
			type: 'number'
		});

		options('t', {
			alias: 'with-tests',
			describe: 'build tests as well as sources'
		});

		options('locale', {
			describe: 'The default locale for the application',
			type: 'string'
		});

		options('supportedLocales', {
			describe: 'Any additional locales supported by the application',
			type: 'array'
		});

		options('messageBundles', {
			describe: 'Any message bundles to include in the build',
			type: 'array'
		});

		options('element', {
			describe: 'Path to a custom element descriptor factory',
			type: 'string'
		});

		options('elementPrefix', {
			describe: 'Output file for custom element',
			type: 'string'
		});
	},
	run(helper: Helper, args: BuildArgs) {
		const options: WebpackOptions = {
			compress: true,
			stats: {
				colors: true,
				chunks: false
			}
		};
		const configArgs = getConfigArgs(args);

		if (args.watch) {
			return watch(config(configArgs), options, args);
		}
		else {
			return compile(config(configArgs), options);
		}
	},
	eject() {
		return {
			npm: {
				devDependencies: {
					'json-css-module-loader': '^1.0.0'
				}
			}
		};
	}
};
export default command;
