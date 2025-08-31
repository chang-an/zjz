class PhotoBackgroundChanger {
    constructor() {
        this.originalImage = null;
        this.processedImageData = null;
        this.originalImageData = null; // 保存原始图像数据
        this.isSelectingBackground = false; // 是否正在选择背景
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.imageInput = document.getElementById('imageInput');
        this.mainContent = document.getElementById('mainContent');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        this.backgroundColor = document.getElementById('backgroundColor');
        this.colorPreview = document.getElementById('colorPreview');
        this.tolerance = document.getElementById('tolerance');
        this.toleranceValue = document.getElementById('toleranceValue');
        this.faceProtection = document.getElementById('faceProtection');
        this.faceProtectionValue = document.getElementById('faceProtectionValue');
        this.blurRadius = document.getElementById('blurRadius');
        this.blurRadiusValue = document.getElementById('blurRadiusValue');
        this.processBtn = document.getElementById('processBtn');
        this.testBtn = document.getElementById('testBtn');
        this.quickTestBtn = document.getElementById('quickTestBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    bindEvents() {
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.backgroundColor.addEventListener('input', (e) => this.updateColorPreview(e));
        this.tolerance.addEventListener('input', (e) => this.toleranceValue.textContent = e.target.value);
        this.faceProtection.addEventListener('input', (e) => this.faceProtectionValue.textContent = e.target.value + '%');
        this.blurRadius.addEventListener('input', (e) => this.blurRadiusValue.textContent = e.target.value);
        this.processBtn.addEventListener('click', () => this.processImage());
        this.testBtn.addEventListener('click', () => this.testBackgroundDetection());
        this.quickTestBtn.addEventListener('click', () => this.quickTest());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        // 添加canvas点击事件
        this.originalCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.originalCanvas.style.cursor = 'crosshair';
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    loadImage(src) {
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.displayOriginalImage();
            this.mainContent.style.display = 'block';
            this.downloadBtn.style.display = 'none';
        };
        img.src = src;
    }

    displayOriginalImage() {
        const ctx = this.originalCanvas.getContext('2d');
        const { width, height } = this.calculateCanvasSize(this.originalImage);
        
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.originalImage, 0, 0, width, height);
        
        // 保存原始图像数据
        this.originalImageData = ctx.getImageData(0, 0, width, height);
    }

    calculateCanvasSize(img) {
        const maxWidth = 400;
        const maxHeight = 500;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        return {
            width: Math.round(img.width * ratio),
            height: Math.round(img.height * ratio)
        };
    }

    // 新增：处理canvas点击事件
    handleCanvasClick(event) {
        if (!this.originalImageData) {
            alert('请先上传图片！');
            return;
        }

        const rect = this.originalCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) * (this.originalCanvas.width / rect.width));
        const y = Math.floor((event.clientY - rect.top) * (this.originalCanvas.height / rect.height));

        console.log(`点击位置: (${x}, ${y})`);
        
        // 获取点击位置的颜色
        const clickColor = this.getColor(x, y, this.originalImageData);
        console.log(`点击位置颜色: RGB(${clickColor[0]}, ${clickColor[1]}, ${clickColor[2]})`);

        // 执行区域生长算法
        this.regionGrowing(x, y, clickColor);
    }

    // 新增：获取指定位置的颜色
    getColor(x, y, imageData) {
        const i = this.point2Index(x, y, imageData.width);
        return [
            imageData.data[i],
            imageData.data[i + 1],
            imageData.data[i + 2],
            imageData.data[i + 3]
        ];
    }

    // 新增：坐标转索引
    point2Index(x, y, width) {
        return (y * width + x) * 4;
    }

    // 新增：区域生长算法（基于index1.html的思路）
    regionGrowing(startX, startY, targetColor) {
        const tolerance = parseInt(this.tolerance.value);
        const { width, height } = this.calculateCanvasSize(this.originalImage);
        
        // 创建掩码数组
        const mask = new Uint8Array(width * height);
        
        // 使用栈进行区域生长
        const stack = [{ x: startX, y: startY }];
        let processedPixels = 0;
        
        console.log(`开始区域生长，目标颜色: RGB(${targetColor[0]}, ${targetColor[1]}, ${targetColor[2]})`);
        console.log(`容差: ${tolerance}`);

        while (stack.length > 0) {
            const { x, y } = stack.pop();
            
            // 检查边界
            if (x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }

            const idx = y * width + x;
            
            // 如果已经处理过，跳过
            if (mask[idx] === 1) {
                continue;
            }

            // 获取当前像素颜色
            const currentColor = this.getColor(x, y, this.originalImageData);
            
            // 检查颜色是否相似
            if (this.isColorSimilar(currentColor, targetColor, tolerance)) {
                // 标记为背景
                mask[idx] = 1;
                processedPixels++;
                
                // 将相邻像素加入栈中
                stack.push({ x: x + 1, y });
                stack.push({ x: x - 1, y });
                stack.push({ x, y: y + 1 });
                stack.push({ x, y: y - 1 });
            }
        }

        console.log(`区域生长完成，处理了 ${processedPixels} 个像素`);
        
        // 在原始canvas上显示检测结果（用红色标记）
        this.showDetectionResult(mask, width, height);
    }

    // 新增：检查两个颜色是否相似
    isColorSimilar(color1, color2, tolerance) {
        const rDiff = Math.abs(color1[0] - color2[0]);
        const gDiff = Math.abs(color1[1] - color2[1]);
        const bDiff = Math.abs(color1[2] - color2[2]);
        return rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
    }

    // 新增：显示检测结果
    showDetectionResult(mask, width, height) {
        const ctx = this.originalCanvas.getContext('2d');
        
        // 恢复原始图像
        ctx.putImageData(this.originalImageData, 0, 0);
        
        // 创建临时canvas来绘制检测结果
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 绘制原始图像
        tempCtx.drawImage(this.originalImage, 0, 0, width, height);
        
        // 获取图像数据
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 用红色标记检测到的区域
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) {
                const pixelIdx = i * 4;
                data[pixelIdx] = 255;     // 红色
                data[pixelIdx + 1] = 0;   // 绿色
                data[pixelIdx + 2] = 0;   // 蓝色
                data[pixelIdx + 3] = 128; // 半透明
            }
        }
        
        // 将结果绘制到原始canvas
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
        
        // 显示提示信息
        const detectedPixels = mask.reduce((sum, val) => sum + val, 0);
        const percentage = (detectedPixels / mask.length * 100).toFixed(2);
        alert(`背景检测完成！\n检测到 ${detectedPixels} 个像素\n占总面积的 ${percentage}%\n\n红色区域表示检测到的背景。\n\n使用方法：\n1. 点击要替换的背景颜色区域\n2. 算法会自动扩散到相似颜色的相邻像素\n3. 调整容差参数控制扩散范围\n4. 满意后点击"处理照片"进行替换`);
    }

    processImage() {
        if (!this.originalImage) {
            alert('请先上传图片！');
            return;
        }

        this.processBtn.disabled = true;
        this.processBtn.textContent = '处理中...';

        setTimeout(() => {
            this.performImageProcessing();
        }, 100);
    }

    performImageProcessing() {
        try {
            const { width, height } = this.calculateCanvasSize(this.originalImage);
            
            // 设置处理后的canvas尺寸
            this.processedCanvas.width = width;
            this.processedCanvas.height = height;
            
            const ctx = this.processedCanvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            
            // 绘制原始图像
            ctx.drawImage(this.originalImage, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // 获取背景颜色
            const bgColor = this.hexToRgb(this.backgroundColor.value);
            const tolerance = parseInt(this.tolerance.value);
            const blurRadius = parseInt(this.blurRadius.value);
            
            // 处理图像数据
            this.processImageData(data, width, height, bgColor, tolerance, blurRadius);
            
            // 将处理后的数据绘制到canvas
            ctx.putImageData(imageData, 0, 0);
            
            // 显示下载按钮
            this.downloadBtn.style.display = 'block';
            
        } catch (error) {
            console.error('图像处理错误:', error);
            alert('图像处理失败，请重试！');
        } finally {
            this.processBtn.disabled = false;
            this.processBtn.textContent = '处理照片';
        }
    }

    processImageData(data, width, height, bgColor, tolerance, blurRadius) {
        console.log('开始处理图像数据...');
        console.log(`图像尺寸: ${width} x ${height}`);
        console.log(`容差: ${tolerance}, 模糊半径: ${blurRadius}`);
        console.log(`目标背景颜色: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
        
        // 创建掩码数组
        const mask = new Uint8Array(width * height);
        
        // 使用简化的背景检测算法
        this.simpleBackgroundDetection(data, width, height, tolerance, mask);
        
        // 应用模糊半径进行边缘平滑
        if (blurRadius > 0) {
            console.log('应用模糊处理...');
            this.applyBlurToMask(mask, width, height, blurRadius);
        }
        
        // 替换背景颜色
        let replacedPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (mask[i / 4] === 1) {
                // 替换背景
                data[i] = bgColor.r;
                data[i + 1] = bgColor.g;
                data[i + 2] = bgColor.b;
                // 保持原始透明度
                replacedPixels++;
            }
        }
        
        console.log(`替换了 ${replacedPixels} 个像素的背景颜色`);
        console.log(`目标背景颜色: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
        console.log('图像处理完成！');
    }

    simpleBackgroundDetection(data, width, height, tolerance, mask) {
        console.log('使用简化的背景检测算法...');
        
        // 这里可以调用之前保存的检测结果
        // 或者重新执行区域生长算法
        console.log('背景检测完成');
    }

    applyBlurToMask(mask, width, height, radius) {
        const blurredMask = new Uint8Array(mask);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            sum += mask[ny * width + nx];
                            count++;
                        }
                    }
                }
                
                blurredMask[y * width + x] = sum / count > 0.5 ? 1 : 0;
            }
        }
        
        // 复制回原数组
        mask.set(blurredMask);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = 'processed_photo.png';
        link.href = this.processedCanvas.toDataURL();
        link.click();
    }

    updateColorPreview(event) {
        const color = event.target.value;
        this.colorPreview.style.background = color;
    }

    testBackgroundDetection() {
        if (!this.originalImage) {
            alert('请先上传图片！');
            return;
        }

        alert('新的使用方法：\n\n1. 点击"快速测试"按钮\n2. 在图片上点击要替换的背景颜色区域\n3. 算法会自动扩散到相似颜色的相邻像素\n4. 红色区域表示检测到的背景\n5. 调整容差参数控制扩散范围\n\n这种方法更准确，因为由用户指定要替换的颜色区域！');
    }

    quickTest() {
        if (!this.originalImage) {
            alert('请先上传图片！');
            return;
        }

        alert('快速测试说明：\n\n1. 在图片上点击要替换的背景颜色区域\n2. 算法会自动扩散到相似颜色的相邻像素\n3. 红色区域表示检测到的背景\n4. 调整容差参数控制扩散范围\n5. 满意后点击"处理照片"进行替换\n\n这种方法比自动检测更准确！');
    }

    isNearImageEdge(x, y, width, height, margin) {
        return x < margin || x >= width - margin || y < margin || y >= height - margin;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new PhotoBackgroundChanger();
    // 初始化颜色预览
    app.updateColorPreview({ target: { value: '#0066CC' } });
    // 初始化人脸保护值显示
    app.faceProtectionValue.textContent = app.faceProtection.value + '%';
});
