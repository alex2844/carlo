#!/usr/bin/env node

const carlo = require('carlo');
const { rpc } = require('carlo/rpc');

const os = require('os');
const path = require('path');
const si = require('systeminformation');

const cecRemote = require('hdmi-cec').Remote;

class Backend {
	constructor(app) {
		this.app_ = app;
		this.windows_ = new Map();
	}
	showMyWindow(url) {
		let windowPromise = this.windows_.get(url);
		if (!windowPromise) {
			windowPromise = this.createWindow_(url);
			this.windows_.set(url, windowPromise);
		}
		windowPromise.then(w => w.bringToFront());
	}
	async createWindow_(url) {
		const window = await this.app_.createWindow({
			width: 800, height: 700, top: 200, left: 10
		});
		window.on('close', () => this.windows_.delete(url));
		window.load(url);
		return window;
	}
}
async function systeminfo() {
	const info = {};
	await Promise.all([
		si.battery().then(r => info.battery = r),
		si.cpu().then(r => info.cpu = r),
		si.osInfo().then(r => info.osInfo = r),
	]);
	return info;
}

(async() => {
	let app;
	try {
		app = await carlo.launch({
			bgcolor: '#2b2e3b',
			title: 'Systeminfo App',
			width: 1000,
			height: 600,
			// channel: ['canary', 'stable', 'chromium'],
			icon: path.join(__dirname, '/icon.png'),
			localDataDir: path.join(os.homedir(), '.carlosysteminfo'),
		});
	} catch(e) {
		console.log('Reusing the running instance', e);
		return;
	}
	app.on('exit', () => process.exit());
	const mainWindow = app.mainWindow();
	mainWindow.on('close', () => process.exit());
	mainWindow.serveFolder(__dirname);
	await mainWindow.exposeFunction('systeminfo', systeminfo);
	await mainWindow.load('index.html', rpc.handle(new Backend(app)));
	let remote = new cecRemote();
	remote.monitor.client.on('error', err => {
		mainWindow.evaluate(err_ => setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', {
			code: err_
		})), 1000), err.toString());
	})
	remote.on('keypress', evt => mainWindow.evaluate(evt_ => window.dispatchEvent(new KeyboardEvent('keydown', evt_)), evt));
	return app;
})();
