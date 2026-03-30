import {
	CubismFramework,
	LogLevel,
	Option
} from '../vendor/cubismwebframework/src/live2dcubismframework';
import { CubismModelSettingJson } from '../vendor/cubismwebframework/src/cubismmodelsettingjson';
import { CubismEyeBlink } from '../vendor/cubismwebframework/src/effect/cubismeyeblink';
import type { CubismIdHandle } from '../vendor/cubismwebframework/src/id/cubismid';
import { CubismMatrix44 } from '../vendor/cubismwebframework/src/math/cubismmatrix44';
import { CubismModelMatrix } from '../vendor/cubismwebframework/src/math/cubismmodelmatrix';
import { CubismMoc } from '../vendor/cubismwebframework/src/model/cubismmoc';
import { CubismMotion } from '../vendor/cubismwebframework/src/motion/cubismmotion';
import { CubismMotionQueueManager } from '../vendor/cubismwebframework/src/motion/cubismmotionqueuemanager';
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
	idleMotionEnabled?: boolean;
	idleMotionIntensity?: number;
	idleMotionFiles?: string[];
	mouthOpenScale?: number;
	modelScale?: number;
	fitMode?: 'contain' | 'cover';
	fitPadding?: number;
	panLimitX?: number;
	panLimitY?: number;
	panOverflowX?: number;
	panOverflowTop?: number;
	panOverflowBottom?: number;
	logger?: RuntimeLogger;
}

export interface Cubism5AvatarHandle {
	start(): void;
	stop(): void;
	resize(): void;
	setAutoBlink(enabled: boolean): void;
	setPan(x: number, y: number): void;
	setMouthOpen(value: number): void;
	destroy(): Promise<void>;
}

interface CubismCoreGlobal {
	Live2DCubismCore?: unknown;
}

type FitMode = 'contain' | 'cover';

type BoundsRect = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
};

type TranslationRange = {
	min: number;
	max: number;
};

type IdleMotionParameterIndices = {
	hairFront: number;
	hairSide: number;
	hairBack: number;
	dress1: number;
	dress2: number;
	dress3: number;
	dress4: number;
};

type CubismModelInstance = NonNullable<ReturnType<CubismMoc['createModel']>>;

const DEFAULT_CORE_SCRIPT = '/live2d/cubism5/core/live2dcubismcore.min.js';
const DEFAULT_CORE_BRIDGE_SCRIPT = '/live2d/cubism5/core/live2dcubismcore.bridge.js';
const DEFAULT_SHADER_DIR = '/live2d/cubism5/shaders/WebGL/';
const MAX_FRAME_DELTA_SECONDS = 0.1;
const MOUTH_SMOOTH_SPEED = 18;
const MOUTH_HIGH_LEVEL_THRESHOLD = 0.56;
const MOUTH_HIGH_LEVEL_HOLD_SECONDS = 0.14;
const MOUTH_HIGH_LEVEL_WOBBLE_SPEED = 18;
const MOUTH_HIGH_LEVEL_WOBBLE_AMOUNT = 0.19;
const MOUTH_SPEECH_WOBBLE_AMOUNT = 0.08;
const MOUTH_FORM_WOBBLE_AMOUNT = 0.52;
const DEFAULT_MOUTH_OPEN_SCALE = 0.5;
const DEFAULT_IDLE_MOTION_INTENSITY = 1;
const DEFAULT_IDLE_MOTION_FILES = [
	'animations/待机姿势.motion3.json',
	'animations/随机说话待机.motion3.json'
];
const IDLE_MOTION_SWITCH_MIN_SECONDS = 11;
const IDLE_MOTION_SWITCH_MAX_SECONDS = 18;

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

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function normalizeFitPadding(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}

	return clamp(value, 0, 0.45);
}

function normalizePanLimit(value: number): number {
	if (Number.isNaN(value)) {
		return 1;
	}

	return clamp(value, 0.2, 3);
}

function normalizePanOverflow(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}

	return clamp(value, 0, 2);
}

function normalizeMouthOpenScale(value: number): number {
	if (Number.isNaN(value)) {
		return DEFAULT_MOUTH_OPEN_SCALE;
	}

	return clamp(value, 0, 1.5);
}

function normalizeIdleMotionIntensity(value: number): number {
	if (Number.isNaN(value)) {
		return DEFAULT_IDLE_MOTION_INTENSITY;
	}

	return clamp(value, 0, 2);
}

function normalizeIdleMotionFiles(files: string[]): string[] {
	const uniqueFiles = new Set<string>();

	for (const file of files) {
		if (typeof file !== 'string') {
			continue;
		}

		const trimmed = file.trim();
		if (!trimmed) {
			continue;
		}

		uniqueFiles.add(trimmed);
	}

	return Array.from(uniqueFiles);
}

function chooseNextIdleMotionIndex(count: number, currentIndex: number): number {
	if (count <= 1) {
		return 0;
	}

	let nextIndex = Math.floor(Math.random() * count);
	if (nextIndex === currentIndex) {
		nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (count - 1))) % count;
	}

	return nextIndex;
}

function getRandomIdleMotionSwitchInterval(): number {
	const span = Math.max(0, IDLE_MOTION_SWITCH_MAX_SECONDS - IDLE_MOTION_SWITCH_MIN_SECONDS);
	return IDLE_MOTION_SWITCH_MIN_SECONDS + Math.random() * span;
}

function createBoundsRect(minX: number, maxX: number, minY: number, maxY: number): BoundsRect {
	const width = Math.max(0.000001, maxX - minX);
	const height = Math.max(0.000001, maxY - minY);

	return {
		minX,
		maxX,
		minY,
		maxY,
		width,
		height,
		centerX: (minX + maxX) * 0.5,
		centerY: (minY + maxY) * 0.5
	};
}

function collectDrawableBounds(model: CubismModelInstance, onlyVisible: boolean): BoundsRect | null {
	const drawableCount = model.getDrawableCount();
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (let drawableIndex = 0; drawableIndex < drawableCount; drawableIndex += 1) {
		if (onlyVisible) {
			if (!model.getDrawableDynamicFlagIsVisible(drawableIndex)) {
				continue;
			}

			if (model.getDrawableOpacity(drawableIndex) <= 0.001) {
				continue;
			}
		}

		const vertices = model.getDrawableVertexPositions(drawableIndex);
		if (!vertices || vertices.length < 2) {
			continue;
		}

		for (let i = 0; i < vertices.length - 1; i += 2) {
			const x = vertices[i];
			const y = vertices[i + 1];

			if (!Number.isFinite(x) || !Number.isFinite(y)) {
				continue;
			}

			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
		return null;
	}

	return createBoundsRect(minX, maxX, minY, maxY);
}

function collectModelBounds(model: CubismModelInstance): BoundsRect | null {
	return collectDrawableBounds(model, true) ?? collectDrawableBounds(model, false);
}

function transformBoundsByScaleAndTranslation(
	bounds: BoundsRect,
	scaleX: number,
	scaleY: number,
	translateX: number,
	translateY: number
): BoundsRect {
	const x1 = bounds.minX * scaleX + translateX;
	const x2 = bounds.maxX * scaleX + translateX;
	const y1 = bounds.minY * scaleY + translateY;
	const y2 = bounds.maxY * scaleY + translateY;

	return createBoundsRect(
		Math.min(x1, x2),
		Math.max(x1, x2),
		Math.min(y1, y2),
		Math.max(y1, y2)
	);
}

// 投影矩阵会把短边标准化到 [-1, 1]，这里据此计算当前可见世界尺寸。
function getVisibleWorldSize(canvas: HTMLCanvasElement): { width: number; height: number } {
	const width = Math.max(1, canvas.width);
	const height = Math.max(1, canvas.height);
	const aspect = width / height;

	if (aspect >= 1) {
		return {
			width: 2 * aspect,
			height: 2
		};
	}

	return {
		width: 2,
		height: 2 / aspect
	};
}

function createAdaptiveFitMatrix(
	bounds: BoundsRect,
	canvas: HTMLCanvasElement,
	fitMode: FitMode,
	fitPadding: number
): CubismMatrix44 {
	const visibleWorld = getVisibleWorldSize(canvas);
	const contentScale = Math.max(0.000001, 1 - fitPadding * 2);
	const targetWidth = Math.max(0.000001, visibleWorld.width * contentScale);
	const targetHeight = Math.max(0.000001, visibleWorld.height * contentScale);

	const scaleByWidth = targetWidth / bounds.width;
	const scaleByHeight = targetHeight / bounds.height;
	const scale = fitMode === 'cover' ? Math.max(scaleByWidth, scaleByHeight) : Math.min(scaleByWidth, scaleByHeight);

	const matrix = new CubismMatrix44();
	matrix.scale(scale, scale);
	matrix.translate(-bounds.centerX * scale, -bounds.centerY * scale);
	return matrix;
}

function normalizeTranslationRange(min: number, max: number): TranslationRange {
	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		return { min: 0, max: 0 };
	}

	if (min <= max) {
		return { min, max };
	}

	const center = (min + max) * 0.5;
	return { min: center, max: center };
}

function getContainTranslationRange(minBound: number, maxBound: number, halfVisible: number): TranslationRange {
	const min = -halfVisible - minBound;
	const max = halfVisible - maxBound;
	return normalizeTranslationRange(min, max);
}

function getCoverTranslationRange(minBound: number, maxBound: number, halfVisible: number): TranslationRange {
	const min = halfVisible - maxBound;
	const max = -halfVisible - minBound;
	return normalizeTranslationRange(min, max);
}

function resolvePanTranslation(
	fittedBounds: BoundsRect,
	visibleWorld: { width: number; height: number },
	fitMode: FitMode,
	panX: number,
	panY: number,
	panLimitX: number,
	panLimitY: number,
	panOverflowX: number,
	panOverflowTop: number,
	panOverflowBottom: number
): { x: number; y: number } {
	const halfVisibleWidth = visibleWorld.width * 0.5;
	const halfVisibleHeight = visibleWorld.height * 0.5;
	const desiredX = clamp(panX, -panLimitX, panLimitX) * halfVisibleWidth;
	const desiredY = clamp(panY, -panLimitY, panLimitY) * halfVisibleHeight;

	const baseXRange =
		fitMode === 'cover'
			? getCoverTranslationRange(fittedBounds.minX, fittedBounds.maxX, halfVisibleWidth)
			: getContainTranslationRange(fittedBounds.minX, fittedBounds.maxX, halfVisibleWidth);
	const baseYRange =
		fitMode === 'cover'
			? getCoverTranslationRange(fittedBounds.minY, fittedBounds.maxY, halfVisibleHeight)
			: getContainTranslationRange(fittedBounds.minY, fittedBounds.maxY, halfVisibleHeight);

	// 允许在不改变默认初始布局的前提下，给拖动保留少量可控越界余量。
	const overflowX = halfVisibleWidth * panOverflowX;
	const overflowTop = halfVisibleHeight * panOverflowTop;
	const overflowBottom = halfVisibleHeight * panOverflowBottom;

	const xRange = {
		min: baseXRange.min - overflowX,
		max: baseXRange.max + overflowX
	};
	const yRange = {
		min: baseYRange.min - overflowBottom,
		max: baseYRange.max + overflowTop
	};

	return {
		x: clamp(desiredX, xRange.min, xRange.max),
		y: clamp(desiredY, yRange.min, yRange.max)
	};
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

function resolveParameterIndex(model: CubismModelInstance, parameterName: string): number {
	const parameterId = CubismFramework.getIdManager().getId(parameterName);
	return model.getParameterIndex(parameterId);
}

function addParameterOffset(
	model: CubismModelInstance,
	parameterIndex: number,
	offsetValue: number,
	weight: number
): void {
	if (parameterIndex < 0) {
		return;
	}

	const min = model.getParameterMinimumValue(parameterIndex);
	const max = model.getParameterMaximumValue(parameterIndex);
	const range = Number.isFinite(min) && Number.isFinite(max) ? Math.abs(max - min) : 1;
	const adaptiveScale = clamp(range * 0.18, 0.9, 4.2);

	model.addParameterValueByIndex(parameterIndex, offsetValue * adaptiveScale, weight);
}

function applyIdleMotion(
	model: CubismModelInstance,
	elapsedSeconds: number,
	intensity: number,
	indices: IdleMotionParameterIndices
): void {
	if (intensity <= 0) {
		return;
	}

	const gustSlow = Math.sin(elapsedSeconds * 0.72 + 0.2);
	const gustMid = Math.sin(elapsedSeconds * 1.12 + 1.4);
	const gustFast = Math.sin(elapsedSeconds * 1.75 + 2.1);
	const flutter = Math.sin(elapsedSeconds * 2.45 + 0.8);
	const shimmer = Math.sin(elapsedSeconds * 3.9 + 0.45);
	const gustEnvelope = Math.pow((Math.sin(elapsedSeconds * 0.34 - 0.8) + 1) * 0.5, 1.6);
	const hairBoost = 2.15;

	// 只驱动衣服与头发，避免头脸身体晃动导致恐怖谷效应。
	addParameterOffset(
		model,
		indices.hairFront,
		(gustMid * 0.98 + gustFast * 0.44 + flutter * 0.38 + gustEnvelope * 0.46 + shimmer * 0.2) *
			hairBoost *
			intensity,
		0.7
	);
	addParameterOffset(
		model,
		indices.hairSide,
		(gustSlow * 1.02 + gustMid * 0.32 + gustFast * 0.42 + gustEnvelope * 0.41 + shimmer * 0.18) *
			hairBoost *
			intensity,
		0.68
	);
	addParameterOffset(
		model,
		indices.hairBack,
		(gustSlow * 1.08 + gustMid * 0.4 + flutter * 0.34 + gustEnvelope * 0.38 + shimmer * 0.16) *
			hairBoost *
			intensity,
		0.66
	);

	addParameterOffset(
		model,
		indices.dress1,
		(gustSlow * 0.5 + flutter * 0.24 + gustEnvelope * 0.16) * intensity,
		0.42
	);
	addParameterOffset(
		model,
		indices.dress2,
		(gustMid * 0.48 + flutter * 0.22 + gustEnvelope * 0.15) * intensity,
		0.4
	);
	addParameterOffset(
		model,
		indices.dress3,
		(gustFast * 0.46 + flutter * 0.21) * intensity,
		0.37
	);
	addParameterOffset(
		model,
		indices.dress4,
		(gustMid * 0.38 + flutter * 0.18) * intensity,
		0.34
	);
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
		idleMotionEnabled = true,
		idleMotionIntensity = DEFAULT_IDLE_MOTION_INTENSITY,
		idleMotionFiles = DEFAULT_IDLE_MOTION_FILES,
		mouthOpenScale = DEFAULT_MOUTH_OPEN_SCALE,
		modelScale = 1,
		fitMode = 'contain',
		fitPadding = 0,
		panLimitX = 1,
		panLimitY = 1,
		panOverflowX = 0,
		panOverflowTop = 0,
		panOverflowBottom = 0,
		logger
	} = options;

	const resolvedFitMode: FitMode = fitMode === 'cover' ? 'cover' : 'contain';
	const resolvedFitPadding = normalizeFitPadding(fitPadding);
	const resolvedPanLimitX = normalizePanLimit(panLimitX);
	const resolvedPanLimitY = normalizePanLimit(panLimitY);
	const resolvedPanOverflowX = normalizePanOverflow(panOverflowX);
	const resolvedPanOverflowTop = normalizePanOverflow(panOverflowTop);
	const resolvedPanOverflowBottom = normalizePanOverflow(panOverflowBottom);
	const resolvedMouthOpenScale = normalizeMouthOpenScale(mouthOpenScale);
	const resolvedIdleMotionIntensity = normalizeIdleMotionIntensity(idleMotionIntensity);
	const resolvedIdleMotionFiles = normalizeIdleMotionFiles(idleMotionFiles);

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
	let mouthOpenParameterIndex = -1;
	let mouthFormParameterIndex = -1;
	const lipSyncParameterIndices: number[] = [];
	let mouthTargetValue = 0;
	let mouthCurrentValue = 0;
	let mouthStableHighSeconds = 0;
	let mouthHighLevelPhase = Math.random() * Math.PI * 2;
	let mouthSpeechPhase = Math.random() * Math.PI * 2;
	let idleElapsedSeconds = 0;
	let idleMotionElapsedSeconds = 0;
	let idleMotionNextSwitchSeconds = Number.POSITIVE_INFINITY;
	let idleMotionCurrentIndex = -1;
	let panNormalizedX = 0;
	let panNormalizedY = 0;
	let renderer: CubismRenderer_WebGL | null = null;
	let modelMatrix: CubismModelMatrix | null = null;
	let baseModelMatrix: CubismMatrix44 | null = null;
	let modelBoundsInBaseWorld: BoundsRect | null = null;
	let idleMotionManager: CubismMotionQueueManager | null = null;
	const idleMotions: CubismMotion[] = [];
	const idleMotionNames: string[] = [];
	let idleMotionParameterIndices: IdleMotionParameterIndices = {
		hairFront: -1,
		hairSide: -1,
		hairBack: -1,
		dress1: -1,
		dress2: -1,
		dress3: -1,
		dress4: -1
	};
	const textures: WebGLTexture[] = [];

	const modelJsonUrl = toAbsoluteUrl(modelJsonPath);
	const modelDirectoryUrl = new URL('./', modelJsonUrl).toString();

	const hasIdleMotionTracks = (): boolean =>
		Boolean(idleMotionEnabled && idleMotionManager && idleMotions.length > 0);

	const scheduleNextIdleMotionSwitch = (): void => {
		if (idleMotions.length <= 1) {
			idleMotionNextSwitchSeconds = Number.POSITIVE_INFINITY;
			return;
		}

		idleMotionNextSwitchSeconds =
			idleMotionElapsedSeconds + getRandomIdleMotionSwitchInterval();
	};

	const startIdleMotion = (targetIndex?: number): void => {
		if (!idleMotionManager || idleMotions.length === 0) {
			return;
		}

		const nextIndex =
			typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < idleMotions.length
				? targetIndex
				: chooseNextIdleMotionIndex(idleMotions.length, idleMotionCurrentIndex);

		const motion = idleMotions[nextIndex];
		idleMotionManager.startMotion(motion, false);
		idleMotionCurrentIndex = nextIndex;
		scheduleNextIdleMotionSwitch();

		const motionName = idleMotionNames[nextIndex] ?? `#${nextIndex + 1}`;
		logSafe(logger, 'info', 'idle-motion', `切换待机动作: ${motionName}`);
	};

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

		// 口型参数优先使用 ParamMouthOpenY；若缺失再回退到 LipSync 组首个参数。
		const parameterCount = model.getParameterCount();
		const collectedLipSyncIndices = new Set<number>();

		if (modelSetting.getLipSyncParameterCount() > 0) {
			for (let i = 0; i < modelSetting.getLipSyncParameterCount(); i += 1) {
				const lipSyncParameterId = modelSetting.getLipSyncParameterId(i);
				const index = model.getParameterIndex(lipSyncParameterId);
				if (index >= 0 && index < parameterCount) {
					collectedLipSyncIndices.add(index);
				}
			}

			if (collectedLipSyncIndices.size > 0) {
				logSafe(
					logger,
					'info',
					'mouth',
					`检测到 LipSync 参数数量=${collectedLipSyncIndices.size}`
				);
			}
		}

		const mouthOpenParameterId = CubismFramework.getIdManager().getId('ParamMouthOpenY');
		const directMouthOpenIndex = model.getParameterIndex(mouthOpenParameterId);
		if (directMouthOpenIndex >= 0 && directMouthOpenIndex < parameterCount) {
			mouthOpenParameterIndex = directMouthOpenIndex;
			collectedLipSyncIndices.add(directMouthOpenIndex);
			logSafe(
				logger,
				'info',
				'mouth',
				`优先使用 ParamMouthOpenY，index=${directMouthOpenIndex}`
			);
		}

		if (mouthOpenParameterIndex < 0 && collectedLipSyncIndices.size > 0) {
			mouthOpenParameterIndex = Array.from(collectedLipSyncIndices)[0];
			logSafe(
				logger,
				'warn',
				'mouth',
				`未找到 ParamMouthOpenY，回退到 LipSync 参数 index=${mouthOpenParameterIndex}`
			);
		}

		lipSyncParameterIndices.length = 0;
		for (const index of collectedLipSyncIndices) {
			lipSyncParameterIndices.push(index);
		}

		if (mouthOpenParameterIndex < 0) {
			logSafe(logger, 'warn', 'mouth', '未找到可用口型参数，口型联动将禁用');
		} else if (lipSyncParameterIndices.length > 1) {
			logSafe(
				logger,
				'info',
				'mouth',
				`将同步驱动 ${lipSyncParameterIndices.length} 个口型参数`
			);
		}

		if (mouthOpenParameterIndex < 0) {
			mouthTargetValue = 0;
			mouthCurrentValue = 0;
		}

		mouthFormParameterIndex = resolveParameterIndex(model, 'ParamMouthForm');
		if (mouthFormParameterIndex >= 0) {
			logSafe(logger, 'info', 'mouth', `检测到 ParamMouthForm，index=${mouthFormParameterIndex}`);
		}

		idleMotionParameterIndices = {
			hairFront: resolveParameterIndex(model, 'ParamHairFront'),
			hairSide: resolveParameterIndex(model, 'ParamHairSide'),
			hairBack: resolveParameterIndex(model, 'ParamHairBack'),
			dress1: resolveParameterIndex(model, 'ParamDress1'),
			dress2: resolveParameterIndex(model, 'ParamDress2'),
			dress3: resolveParameterIndex(model, 'ParamDress3'),
			dress4: resolveParameterIndex(model, 'ParamDress4')
		};

		if (idleMotionEnabled && resolvedIdleMotionFiles.length > 0) {
			idleMotionManager = new CubismMotionQueueManager();

			const eyeBlinkEffectIds: CubismIdHandle[] = [];
			for (let i = 0; i < modelSetting.getEyeBlinkParameterCount(); i += 1) {
				eyeBlinkEffectIds.push(modelSetting.getEyeBlinkParameterId(i));
			}

			const lipSyncEffectIds: CubismIdHandle[] = [];
			for (let i = 0; i < modelSetting.getLipSyncParameterCount(); i += 1) {
				lipSyncEffectIds.push(modelSetting.getLipSyncParameterId(i));
			}

			for (const motionFile of resolvedIdleMotionFiles) {
				try {
					const motionUrl = resolveAssetUrl(modelDirectoryUrl, motionFile);
					const motionBuffer = await fetchArrayBuffer(motionUrl);
					const motion = CubismMotion.create(motionBuffer, motionBuffer.byteLength);
					if (!motion) {
						logSafe(logger, 'warn', 'idle-motion', `待机动作创建失败: ${motionFile}`);
						continue;
					}

					motion.setLoop(true);
					motion.setLoopFadeIn(true);
					motion.setFadeInTime(1.2);
					motion.setFadeOutTime(1.2);
					motion.setWeight(clamp(0.58 + resolvedIdleMotionIntensity * 0.28, 0.25, 1));
					motion.setEffectIds(eyeBlinkEffectIds, lipSyncEffectIds);

					idleMotions.push(motion);
					idleMotionNames.push(motionFile);
					logSafe(logger, 'info', 'idle-motion', `待机动作加载成功: ${motionFile}`);
				} catch (error) {
					logSafe(
						logger,
						'warn',
						'idle-motion',
						`待机动作加载失败，已跳过 ${motionFile}: ${stringifyUnknownError(error)}`
					);
				}
			}

			if (idleMotions.length > 0) {
				idleMotionElapsedSeconds = 0;
				idleMotionCurrentIndex = -1;
				idleMotionNextSwitchSeconds = 0;
				startIdleMotion();
				logSafe(logger, 'info', 'idle-motion', `待机动作系统已启用，共 ${idleMotions.length} 条`);
			} else {
				idleMotionManager.release();
				idleMotionManager = null;
				logSafe(logger, 'warn', 'idle-motion', '未加载到可用待机动作，回退参数微动作模式');
			}
		}

		if (hasIdleMotionTracks()) {
			logSafe(logger, 'info', 'effects', '已启用 motion3 待机动作循环');
		} else if (idleMotionEnabled && resolvedIdleMotionIntensity > 0) {
			logSafe(
				logger,
				'info',
				'effects',
				`已启用待机微动作，强度=${resolvedIdleMotionIntensity.toFixed(2)}`
			);
		} else {
			logSafe(logger, 'info', 'effects', '待机微动作已禁用');
		}

		logSafe(logger, 'info', 'mouth', `口型输入缩放系数=${resolvedMouthOpenScale.toFixed(2)}`);

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

		baseModelMatrix = new CubismMatrix44();
		baseModelMatrix.setMatrix(new Float32Array(modelMatrix.getArray()));

		model.update();
		const modelBounds = collectModelBounds(model);
		if (modelBounds) {
			modelBoundsInBaseWorld = transformBoundsByScaleAndTranslation(
				modelBounds,
				baseModelMatrix.getScaleX(),
				baseModelMatrix.getScaleY(),
				baseModelMatrix.getTranslateX(),
				baseModelMatrix.getTranslateY()
			);
			logSafe(
				logger,
				'info',
				'layout',
				`模型边界已计算: ${modelBoundsInBaseWorld.width.toFixed(3)}x${modelBoundsInBaseWorld.height.toFixed(3)} (${resolvedFitMode})`
			);
		} else {
			const fallbackBounds = createBoundsRect(0, model.getCanvasWidth(), 0, model.getCanvasHeight());
			modelBoundsInBaseWorld = transformBoundsByScaleAndTranslation(
				fallbackBounds,
				baseModelMatrix.getScaleX(),
				baseModelMatrix.getScaleY(),
				baseModelMatrix.getTranslateX(),
				baseModelMatrix.getTranslateY()
			);
			logSafe(logger, 'warn', 'layout', '无法从 Drawable 计算边界，已回退到画布边界');
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

		let modelTransform = new CubismMatrix44();
		const visibleWorld = getVisibleWorldSize(canvas);
		let fittedModelBounds: BoundsRect | null = null;

		if (baseModelMatrix && modelBoundsInBaseWorld) {
			const adaptiveFitMatrix = createAdaptiveFitMatrix(
				modelBoundsInBaseWorld,
				canvas,
				resolvedFitMode,
				resolvedFitPadding
			);
			fittedModelBounds = transformBoundsByScaleAndTranslation(
				modelBoundsInBaseWorld,
				adaptiveFitMatrix.getScaleX(),
				adaptiveFitMatrix.getScaleY(),
				adaptiveFitMatrix.getTranslateX(),
				adaptiveFitMatrix.getTranslateY()
			);
			CubismMatrix44.multiply(
				adaptiveFitMatrix.getArray(),
				baseModelMatrix.getArray(),
				modelTransform.getArray()
			);
		} else {
			modelTransform.setMatrix(new Float32Array(modelMatrix.getArray()));
		}

		if (fittedModelBounds) {
			const resolvedTranslation = resolvePanTranslation(
				fittedModelBounds,
				visibleWorld,
				resolvedFitMode,
				panNormalizedX,
				panNormalizedY,
				resolvedPanLimitX,
				resolvedPanLimitY,
				resolvedPanOverflowX,
				resolvedPanOverflowTop,
				resolvedPanOverflowBottom
			);
			const halfVisibleWidth = Math.max(0.000001, visibleWorld.width * 0.5);
			const halfVisibleHeight = Math.max(0.000001, visibleWorld.height * 0.5);
			panNormalizedX = clamp(
				resolvedTranslation.x / halfVisibleWidth,
				-resolvedPanLimitX,
				resolvedPanLimitX
			);
			panNormalizedY = clamp(
				resolvedTranslation.y / halfVisibleHeight,
				-resolvedPanLimitY,
				resolvedPanLimitY
			);

			const panMatrix = new CubismMatrix44();
			panMatrix.translate(resolvedTranslation.x, resolvedTranslation.y);

			const panAppliedTransform = new CubismMatrix44();
			CubismMatrix44.multiply(
				panMatrix.getArray(),
				modelTransform.getArray(),
				panAppliedTransform.getArray()
			);
			modelTransform = panAppliedTransform;
		}

		const mvp = new CubismMatrix44();
		CubismMatrix44.multiply(
			projection.getArray(),
			modelTransform.getArray(),
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

		const useIdleMotionTracks = hasIdleMotionTracks();

		if (useIdleMotionTracks && idleMotionManager) {
			idleMotionElapsedSeconds += deltaSeconds;
			if (idleMotionElapsedSeconds >= idleMotionNextSwitchSeconds) {
				startIdleMotion();
			}

			idleMotionManager.doUpdateMotion(model, idleMotionElapsedSeconds);
		}

		if (physics) {
			physics.evaluate(model, deltaSeconds);
		}

		if (!useIdleMotionTracks && idleMotionEnabled && resolvedIdleMotionIntensity > 0) {
			idleElapsedSeconds += deltaSeconds;
			applyIdleMotion(
				model,
				idleElapsedSeconds,
				resolvedIdleMotionIntensity,
				idleMotionParameterIndices
			);
		}

		if (mouthOpenParameterIndex >= 0) {
			const blend = Math.min(1, deltaSeconds * MOUTH_SMOOTH_SPEED);
			mouthCurrentValue += (mouthTargetValue - mouthCurrentValue) * blend;
			const speakingStrength = clamp01((mouthTargetValue + mouthCurrentValue) * 0.5);

			if (speakingStrength > 0.02) {
				mouthSpeechPhase += deltaSeconds * (10 + speakingStrength * 16);
			}

			const keepHighMouthOpen =
				mouthTargetValue >= MOUTH_HIGH_LEVEL_THRESHOLD &&
				mouthCurrentValue >= MOUTH_HIGH_LEVEL_THRESHOLD;
			if (keepHighMouthOpen) {
				mouthStableHighSeconds += deltaSeconds;
			} else {
				mouthStableHighSeconds = 0;
			}

			let mouthOutputValue = mouthCurrentValue;
			if (speakingStrength > 0.05) {
				const speechWobble =
					(Math.sin(mouthSpeechPhase) + Math.sin(mouthSpeechPhase * 0.47 + 1.3) * 0.62) *
					(0.018 + speakingStrength * MOUTH_SPEECH_WOBBLE_AMOUNT);
				mouthOutputValue = clamp01(mouthOutputValue + speechWobble);
			}

			if (mouthStableHighSeconds > MOUTH_HIGH_LEVEL_HOLD_SECONDS) {
				mouthHighLevelPhase +=
					deltaSeconds * (MOUTH_HIGH_LEVEL_WOBBLE_SPEED + mouthCurrentValue * 9);

				const holdStrength = clamp01(
					(mouthStableHighSeconds - MOUTH_HIGH_LEVEL_HOLD_SECONDS) / 0.7
				);
				const levelStrength = clamp01(
					(mouthCurrentValue - MOUTH_HIGH_LEVEL_THRESHOLD) /
						Math.max(0.0001, 1 - MOUTH_HIGH_LEVEL_THRESHOLD)
				);
				const wobbleStrength = holdStrength * levelStrength;

				const wobble =
					Math.sin(mouthHighLevelPhase) * MOUTH_HIGH_LEVEL_WOBBLE_AMOUNT +
					Math.sin(mouthHighLevelPhase * 0.43 + 1.1) * (MOUTH_HIGH_LEVEL_WOBBLE_AMOUNT * 0.46);

				mouthOutputValue = clamp01(mouthOutputValue + wobble * wobbleStrength);
			}

			model.setParameterValueByIndex(mouthOpenParameterIndex, mouthOutputValue, 1.0);

			if (mouthFormParameterIndex >= 0) {
				const formStrength = clamp01((speakingStrength - 0.08) / 0.92);
				if (formStrength > 0) {
					const mouthFormWobble =
						(Math.sin(mouthSpeechPhase * 0.58 + 0.4) * 0.72 +
							Math.sin(mouthSpeechPhase * 0.23 - 0.9) * 0.38) *
						MOUTH_FORM_WOBBLE_AMOUNT *
						formStrength;
					addParameterOffset(model, mouthFormParameterIndex, mouthFormWobble, 0.56);
				}
			}

			for (const lipSyncIndex of lipSyncParameterIndices) {
				if (lipSyncIndex === mouthOpenParameterIndex) {
					continue;
				}

				// 对其它口型参数做弱驱动，避免只改一个参数导致嘴型几乎不动。
				model.addParameterValueByIndex(lipSyncIndex, mouthOutputValue * 0.45, 0.45);
			}
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

		setPan(x: number, y: number): void {
			if (released) {
				return;
			}

			panNormalizedX = clamp(x, -resolvedPanLimitX, resolvedPanLimitX);
			panNormalizedY = clamp(y, -resolvedPanLimitY, resolvedPanLimitY);
			updateMvp();

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

		setMouthOpen(value: number): void {
			if (released) {
				return;
			}

			mouthTargetValue = clamp01(value) * resolvedMouthOpenScale;
		},

		async destroy(): Promise<void> {
			if (released) {
				return;
			}

			logSafe(logger, 'info', 'destroy', '开始释放 Avatar 资源');
			released = true;
			stopLoop();
			panNormalizedX = 0;
			panNormalizedY = 0;
			mouthTargetValue = 0;
			mouthCurrentValue = 0;
			mouthStableHighSeconds = 0;
			mouthHighLevelPhase = Math.random() * Math.PI * 2;
			mouthSpeechPhase = Math.random() * Math.PI * 2;
			idleElapsedSeconds = 0;
			idleMotionElapsedSeconds = 0;
			idleMotionNextSwitchSeconds = Number.POSITIVE_INFINITY;
			idleMotionCurrentIndex = -1;

			for (const texture of textures) {
				gl.deleteTexture(texture);
			}

			if (idleMotionManager) {
				idleMotionManager.stopAllMotions();
				idleMotionManager.release();
				idleMotionManager = null;
			}

			for (const idleMotion of idleMotions) {
				idleMotion.release();
			}
			idleMotions.length = 0;
			idleMotionNames.length = 0;

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
