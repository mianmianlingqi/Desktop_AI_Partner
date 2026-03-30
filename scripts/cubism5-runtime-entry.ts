import {
	CubismFramework,
	LogLevel,
	Option
} from '../vendor/cubismwebframework/src/live2dcubismframework';
import { CubismModelSettingJson } from '../vendor/cubismwebframework/src/cubismmodelsettingjson';
import { CubismEyeBlink } from '../vendor/cubismwebframework/src/effect/cubismeyeblink';
import { CubismMatrix44 } from '../vendor/cubismwebframework/src/math/cubismmatrix44';
import { CubismModelMatrix } from '../vendor/cubismwebframework/src/math/cubismmodelmatrix';
import { CubismMoc } from '../vendor/cubismwebframework/src/model/cubismmoc';
import { CubismPhysics } from '../vendor/cubismwebframework/src/physics/cubismphysics';
import { CubismRenderer_WebGL } from '../vendor/cubismwebframework/src/rendering/cubismrenderer_webgl';

type RuntimeLogLevel = 'info' | 'warn' | 'error';

type RuntimeLogEntry = {
	level: RuntimeLogLevel;
	stage: string;
	message: string;
	timestamp: number;
};

type RuntimeLogger = (entry: RuntimeLogEntry) => void;

export interface Cubism5AvatarOptions {
	canvas: HTMLCanvasElement;
	modelJsonPath: string;
	coreScriptPath?: string;
	coreBridgeScriptPath?: string;
	shaderDirectory?: string;
	autoBlink?: boolean;
	modelScale?: number;
	logger?: RuntimeLogger;
}

export interface Cubism5AvatarHandle {
	start(): void;
	stop(): void;
	resize(): void;
	setAutoBlink(enabled: boolean): void;
	destroy(): Promise<void>;
}

interface CubismCoreGlobal {
	Live2DCubismCore?: unknown;
}

const DEFAULT_CORE_SCRIPT = '/live2d/cubism5/core/live2dcubismcore.min.js';
const DEFAULT_CORE_BRIDGE_SCRIPT = '/live2d/cubism5/core/live2dcubismcore.bridge.js';
const DEFAULT_SHADER_DIR = '/live2d/cubism5/shaders/WebGL/';
const MAX_FRAME_DELTA_SECONDS = 0.1;

let coreScriptPromise: Promise<void> | null = null;
let coreBridgeScriptPromise: Promise<void> | null = null;
let frameworkReferenceCount = 0;

function stringifyUnknownError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function toAbsoluteUrl(path: string): string {
	return new URL(path, window.location.origin).toString();
}

function resolveAssetUrl(baseDirectoryUrl: string, relativePath: string): string {
	return new URL(relativePath, baseDirectoryUrl).toString();
}

function logSafe(
	logger: RuntimeLogger | undefined,
	level: RuntimeLogLevel,
	stage: string,
	message: string
): void {
	const entry: RuntimeLogEntry = {
		level,
		stage,
		message,
		timestamp: Date.now()
	};

	if (logger) {
		logger(entry);
		return;
	}

	const prefix = `[Cubism5][${stage}]`;

	if (level === 'error') {
		console.error(`${prefix} ${message}`);
	} else if (level === 'warn') {
		console.warn(`${prefix} ${message}`);
	} else {
		console.info(`${prefix} ${message}`);
	}
}

function hasCubismCore(): boolean {
	return Boolean((globalThis as CubismCoreGlobal).Live2DCubismCore);
}

async function loadScriptViaTag(scriptPath: string, errorPrefix: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = toAbsoluteUrl(scriptPath);
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => {
			reject(new Error(`${errorPrefix}: ${script.src}`));
		};
		document.head.appendChild(script);
	});
}

async function loadCoreViaScriptTag(coreScriptPath: string): Promise<void> {
	await loadScriptViaTag(coreScriptPath, '无法加载 Cubism Core 脚本');
}

async function loadCoreBridgeViaScriptTag(coreBridgeScriptPath: string): Promise<void> {
	await loadScriptViaTag(coreBridgeScriptPath, '无法加载 Cubism Core Bridge 脚本');
}

async function loadCoreViaFetchEval(coreScriptPath: string): Promise<void> {
	const coreUrl = toAbsoluteUrl(coreScriptPath);
	const response = await fetch(coreUrl, { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`无法获取 Cubism Core 脚本: ${response.status} ${response.statusText} (${coreUrl})`);
	}

	const sourceCode = await response.text();
	if (!sourceCode.trim()) {
		throw new Error(`Cubism Core 脚本内容为空: ${coreUrl}`);
	}

	// 在全局上下文执行，确保 UMD 变量可挂到全局对象。
	(0, eval)(`${sourceCode}\n//# sourceURL=${coreUrl}`);
}

async function ensureCubismCoreBridgeLoaded(
	coreBridgeScriptPath: string,
	logger?: RuntimeLogger
): Promise<void> {
	logSafe(logger, 'info', 'core-bridge', `开始加载 bridge: ${coreBridgeScriptPath}`);

	if (!coreBridgeScriptPromise) {
		coreBridgeScriptPromise = (async () => {
			await loadCoreBridgeViaScriptTag(coreBridgeScriptPath);
		})().catch(error => {
			coreBridgeScriptPromise = null;
			throw error;
		});
	}

	await coreBridgeScriptPromise;
	logSafe(logger, 'info', 'core-bridge', `Cubism Core bridge 已就绪: ${coreBridgeScriptPath}`);
}

async function ensureCubismCoreLoaded(
	coreScriptPath: string,
	coreBridgeScriptPath: string,
	logger?: RuntimeLogger
): Promise<void> {
	logSafe(logger, 'info', 'core', `检查 Cubism Core: ${coreScriptPath}`);

	if (!coreScriptPromise) {
		coreScriptPromise = (async () => {
			if (!hasCubismCore()) {
				logSafe(logger, 'info', 'core', '未检测到全局 Core，开始注入脚本');
				let scriptError: unknown = null;

				try {
					await loadCoreViaScriptTag(coreScriptPath);
					logSafe(logger, 'info', 'core', 'script 标签加载 Core 成功');
				} catch (error) {
					scriptError = error;
					logSafe(
						logger,
						'warn',
						'core',
						`script 标签加载 Core 失败，改用 fetch+eval 回退：${stringifyUnknownError(error)}`
					);
				}

				if (!hasCubismCore()) {
					logSafe(logger, 'info', 'core', '开始 fetch+eval 回退注入 Core');
					await loadCoreViaFetchEval(coreScriptPath);
					logSafe(logger, 'info', 'core', 'fetch+eval 注入 Core 成功');
				}

				if (!hasCubismCore()) {
					if (scriptError) {
						throw new Error(
							`Cubism Core 初始化失败（script + eval 均未注入全局对象）。scriptError=${stringifyUnknownError(scriptError)}`
						);
					}

					throw new Error('Cubism Core 初始化失败：Live2DCubismCore 未注入全局对象。');
				}
			} else {
				logSafe(logger, 'info', 'core', '检测到全局 Core，跳过注入');
			}

			await ensureCubismCoreBridgeLoaded(coreBridgeScriptPath, logger);
		})().catch(error => {
			coreScriptPromise = null;
			throw error;
		});
	}

	await coreScriptPromise;
	logSafe(logger, 'info', 'core', `Cubism Core 已就绪: ${coreScriptPath}`);
}

function retainFramework(logger?: RuntimeLogger): void {
	if (frameworkReferenceCount === 0) {
		logSafe(logger, 'info', 'framework', '开始启动 Cubism Framework');
		const option = new Option();
		option.loggingLevel = LogLevel.LogLevel_Warning;
		option.logFunction = (message: string) => {
			logSafe(logger, 'info', 'framework', message);
		};

		let startupOk = false;
		try {
			startupOk = CubismFramework.startUp(option);
		} catch (error) {
			throw new Error(
				`Cubism Framework 启动失败：${stringifyUnknownError(error)}。请检查 Core 与 bridge 脚本是否加载。`
			);
		}

		if (!startupOk) {
			throw new Error('Cubism Framework 启动失败。');
		}

		try {
			CubismFramework.initialize();
		} catch (error) {
			throw new Error(`Cubism Framework 初始化失败：${stringifyUnknownError(error)}`);
		}

		logSafe(logger, 'info', 'framework', 'Cubism Framework 初始化完成');
	}

	frameworkReferenceCount += 1;
	logSafe(logger, 'info', 'framework', `Framework 引用计数 +1 => ${frameworkReferenceCount}`);
}

function releaseFramework(): void {
	if (frameworkReferenceCount <= 0) {
		return;
	}

	frameworkReferenceCount -= 1;
	if (frameworkReferenceCount === 0) {
		CubismFramework.dispose();
		CubismFramework.cleanUp();
	}
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`请求失败: ${response.status} ${response.statusText} (${url})`);
	}
	return await response.arrayBuffer();
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`请求失败: ${response.status} ${response.statusText} (${url})`);
	}
	return (await response.json()) as T;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
	const image = new Image();
	image.src = url;

	if ('decode' in image) {
		await image.decode();
		return image;
	}

	await new Promise<void>((resolve, reject) => {
		image.onload = () => resolve();
		image.onerror = () => reject(new Error(`贴图加载失败: ${url}`));
	});
	return image;
}

function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement): WebGLTexture {
	const texture = gl.createTexture();
	if (!texture) {
		throw new Error('无法创建 WebGL 纹理对象。');
	}

	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
	const dpr = window.devicePixelRatio || 1;
	const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
	const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

	if (canvas.width === width && canvas.height === height) {
		return false;
	}

	canvas.width = width;
	canvas.height = height;
	return true;
}

export async function createCubism5Avatar(options: Cubism5AvatarOptions): Promise<Cubism5AvatarHandle> {
	const {
		canvas,
		modelJsonPath,
		coreScriptPath = DEFAULT_CORE_SCRIPT,
		coreBridgeScriptPath = DEFAULT_CORE_BRIDGE_SCRIPT,
		shaderDirectory = DEFAULT_SHADER_DIR,
		autoBlink = true,
		modelScale = 1,
		logger
	} = options;

	if (!canvas) {
		throw new Error('createCubism5Avatar 缺少 canvas 参数。');
	}

	logSafe(logger, 'info', 'bootstrap', `开始创建 Avatar，模型路径: ${modelJsonPath}`);

	await ensureCubismCoreLoaded(coreScriptPath, coreBridgeScriptPath, logger);
	retainFramework(logger);

	const gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: true,
		premultipliedAlpha: true,
		preserveDrawingBuffer: false
	});

	if (!gl) {
		releaseFramework();
		throw new Error('当前环境不支持 WebGL，无法渲染 Live2D 模型。');
	}

	logSafe(logger, 'info', 'webgl', 'WebGL 上下文创建成功');

	let released = false;
	let animationFrameId = 0;
	let running = false;
	let lastFrameTime = performance.now();
	let blinkEnabled = autoBlink;

	let modelSetting: CubismModelSettingJson | null = null;
	let moc: CubismMoc | null = null;
	let model: ReturnType<CubismMoc['createModel']> | null = null;
	let physics: CubismPhysics | null = null;
	let eyeBlink: CubismEyeBlink | null = null;
	let renderer: CubismRenderer_WebGL | null = null;
	let modelMatrix: CubismModelMatrix | null = null;
	const textures: WebGLTexture[] = [];

	const modelJsonUrl = toAbsoluteUrl(modelJsonPath);
	const modelDirectoryUrl = new URL('./', modelJsonUrl).toString();

	const setupResources = async (): Promise<void> => {
		logSafe(logger, 'info', 'model', `开始加载模型配置: ${modelJsonUrl}`);
		const modelSettingsBuffer = await fetchArrayBuffer(modelJsonUrl);
		logSafe(logger, 'info', 'model', `模型配置已读取，字节数: ${modelSettingsBuffer.byteLength}`);

		const modelSettingsJson = await fetchJson<{
			FileReferences?: {
				Moc?: string;
				Textures?: string[];
				Physics?: string;
			};
		}>(modelJsonUrl);
		logSafe(logger, 'info', 'model', '模型配置 JSON 解析完成');

		modelSetting = new CubismModelSettingJson(
			modelSettingsBuffer,
			modelSettingsBuffer.byteLength
		);
		logSafe(logger, 'info', 'model', 'CubismModelSettingJson 初始化完成');

		const mocRelativePath =
			modelSetting.getModelFileName() || modelSettingsJson.FileReferences?.Moc;
		if (!mocRelativePath) {
			throw new Error('模型配置缺少 Moc 字段，无法加载 moc3。');
		}

		logSafe(logger, 'info', 'moc', `开始加载 moc3: ${mocRelativePath}`);

		const mocBuffer = await fetchArrayBuffer(
			resolveAssetUrl(modelDirectoryUrl, mocRelativePath)
		);
		logSafe(logger, 'info', 'moc', `moc3 已读取，字节数: ${mocBuffer.byteLength}`);

		moc = CubismMoc.create(mocBuffer, false);
		if (!moc) {
			throw new Error('CubismMoc.create 失败，请确认 moc3 与 Cubism Core 版本兼容。');
		}
		logSafe(logger, 'info', 'moc', 'CubismMoc.create 成功');

		model = moc.createModel();
		if (!model) {
			throw new Error('Cubism Moc 已加载，但模型实例创建失败。');
		}
		logSafe(logger, 'info', 'model', '模型实例创建成功');

		renderer = new CubismRenderer_WebGL(canvas.width, canvas.height);
		renderer.initialize(model);
		renderer.startUp(gl);
		renderer.setIsPremultipliedAlpha(true);
		logSafe(logger, 'info', 'renderer', `渲染器初始化完成: ${canvas.width}x${canvas.height}`);

		const textureCount = modelSetting.getTextureCount();
		logSafe(logger, 'info', 'textures', `开始加载贴图，共 ${textureCount} 张`);
		for (let i = 0; i < textureCount; i += 1) {
			const textureFile = modelSetting.getTextureFileName(i);
			if (!textureFile) {
				logSafe(logger, 'warn', 'textures', `第 ${i + 1} 张贴图路径为空，跳过`);
				continue;
			}

			const textureUrl = resolveAssetUrl(modelDirectoryUrl, textureFile);
			logSafe(logger, 'info', 'textures', `加载贴图 ${i + 1}/${textureCount}: ${textureFile}`);
			const image = await loadImage(textureUrl);
			const texture = createTexture(gl, image);
			renderer.bindTexture(i, texture);
			textures.push(texture);
		}
		logSafe(logger, 'info', 'textures', `贴图绑定完成，共 ${textures.length} 张`);

		const physicsPath = modelSetting.getPhysicsFileName();
		if (physicsPath) {
			logSafe(logger, 'info', 'physics', `开始加载物理配置: ${physicsPath}`);
			const physicsBuffer = await fetchArrayBuffer(
				resolveAssetUrl(modelDirectoryUrl, physicsPath)
			);
			physics = CubismPhysics.create(physicsBuffer, physicsBuffer.byteLength);
			logSafe(logger, 'info', 'physics', '物理配置加载完成');
		} else {
			logSafe(logger, 'info', 'physics', '模型未配置物理文件，跳过');
		}

		if (modelSetting.getEyeBlinkParameterCount() > 0) {
			eyeBlink = CubismEyeBlink.create(modelSetting);
			logSafe(logger, 'info', 'effects', '已启用自动眨眼参数');
		} else {
			logSafe(logger, 'info', 'effects', '模型未配置眨眼参数，跳过自动眨眼');
		}

		modelMatrix = new CubismModelMatrix(
			model.getCanvasWidth(),
			model.getCanvasHeight()
		);

		const layout = new Map<string, number>();
		const hasLayout = modelSetting.getLayoutMap(layout);
		if (hasLayout) {
			modelMatrix.setupFromLayout(layout);
			logSafe(logger, 'info', 'layout', '已应用模型布局参数');
		} else {
			modelMatrix.setHeight(2.0);
			modelMatrix.setCenterPosition(0, 0);
			logSafe(logger, 'info', 'layout', '未检测到布局参数，使用默认布局');
		}

		if (modelScale !== 1) {
			modelMatrix.scaleRelative(modelScale, modelScale);
			logSafe(logger, 'info', 'layout', `应用外部缩放: ${modelScale}`);
		}

		model.saveParameters();
		logSafe(logger, 'info', 'setup', '模型资源初始化完成');
	};

	const updateMvp = (): void => {
		if (!renderer || !modelMatrix) {
			return;
		}

		const projection = new CubismMatrix44();
		const width = canvas.width;
		const height = canvas.height;

		if (width > height) {
			projection.scale(height / width, 1);
		} else if (height > width) {
			projection.scale(1, width / height);
		}

		const mvp = new CubismMatrix44();
		CubismMatrix44.multiply(
			projection.getArray(),
			modelMatrix.getArray(),
			mvp.getArray()
		);
		renderer.setMvpMatrix(mvp);
	};

	const renderFrame = (): void => {
		if (released || !renderer || !model) {
			return;
		}

		if (!running) {
			return;
		}

		const now = performance.now();
		const deltaSeconds = Math.min(
			MAX_FRAME_DELTA_SECONDS,
			Math.max(0, (now - lastFrameTime) / 1000)
		);
		lastFrameTime = now;

		resizeCanvasToDisplaySize(canvas);
		updateMvp();

		const viewport = [0, 0, canvas.width, canvas.height];
		renderer.setRenderState(
			gl.getParameter(gl.FRAMEBUFFER_BINDING),
			viewport
		);

		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		model.loadParameters();

		if (blinkEnabled && eyeBlink) {
			eyeBlink.updateParameters(model, deltaSeconds);
		}

		if (physics) {
			physics.evaluate(model, deltaSeconds);
		}

		model.update();
		renderer.drawModel(shaderDirectory);

		animationFrameId = window.requestAnimationFrame(renderFrame);
	};

	const stopLoop = (): void => {
		if (!running) {
			return;
		}

		running = false;
		logSafe(logger, 'info', 'loop', '渲染循环已停止');
		if (animationFrameId) {
			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = 0;
		}
	};

	try {
		logSafe(logger, 'info', 'setup', '开始初始化画布尺寸');
		resizeCanvasToDisplaySize(canvas);
		logSafe(logger, 'info', 'setup', '开始初始化模型资源');
		await setupResources();
		updateMvp();
		logSafe(logger, 'info', 'setup', 'Avatar 初始化完成，可启动渲染');
	} catch (error) {
		logSafe(logger, 'error', 'setup', `初始化失败: ${stringifyUnknownError(error)}`);
		releaseFramework();
		throw error;
	}

	const handle: Cubism5AvatarHandle = {
		start(): void {
			if (released || running) {
				return;
			}

			running = true;
			lastFrameTime = performance.now();
			animationFrameId = window.requestAnimationFrame(renderFrame);
			logSafe(logger, 'info', 'loop', '渲染循环已启动');
		},

		stop(): void {
			stopLoop();
		},

		resize(): void {
			if (released) {
				return;
			}

			resizeCanvasToDisplaySize(canvas);
			updateMvp();
			logSafe(logger, 'info', 'layout', `执行 resize: ${canvas.width}x${canvas.height}`);

			if (!running && renderer && model) {
				renderer.setRenderState(
					gl.getParameter(gl.FRAMEBUFFER_BINDING),
					[0, 0, canvas.width, canvas.height]
				);
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				model.update();
				renderer.drawModel(shaderDirectory);
			}
		},

		setAutoBlink(enabled: boolean): void {
			blinkEnabled = enabled;
		},

		async destroy(): Promise<void> {
			if (released) {
				return;
			}

			logSafe(logger, 'info', 'destroy', '开始释放 Avatar 资源');
			released = true;
			stopLoop();

			for (const texture of textures) {
				gl.deleteTexture(texture);
			}

			if (eyeBlink) {
				CubismEyeBlink.delete(eyeBlink);
				eyeBlink = null;
			}

			if (physics) {
				physics.release();
				CubismPhysics.delete(physics);
				physics = null;
			}

			if (renderer) {
				renderer.release();
				renderer = null;
			}

			if (moc && model) {
				moc.deleteModel(model);
			}
			model = null;

			if (moc) {
				moc.release();
				moc = null;
			}

			if (modelSetting) {
				modelSetting.release();
				modelSetting = null;
			}

			releaseFramework();
			logSafe(logger, 'info', 'destroy', 'Avatar 资源释放完成');
		}
	};

	return handle;
}
