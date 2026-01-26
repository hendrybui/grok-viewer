/**
 * Grok Vision - Advanced Image Analysis Module
 * Provides intelligent image analysis, categorization, and quality assessment
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class GrokVision {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * Analyze an image and extract comprehensive information
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(imagePath) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(imagePath);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const stats = await fs.stat(imagePath);
      const metadata = await sharp(imagePath).metadata();
      
      // Extract basic information
      const analysis = {
        path: imagePath,
        filename: path.basename(imagePath),
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: (metadata.width / metadata.height).toFixed(2)
        },
        format: metadata.format,
        colorSpace: metadata.space || 'srgb',
        hasAlpha: metadata.hasAlpha || false,
        orientation: metadata.orientation || 1,
        density: metadata.density || 72,
        
        // Quality assessment
        quality: await this.assessQuality(imagePath, metadata),
        
        // Content analysis
        content: await this.analyzeContent(imagePath, metadata),
        
        // Technical details
        technical: {
          channels: metadata.channels,
          depth: metadata.depth,
          isProgressive: metadata.isProgressive || false
        },
        
        // Timestamp
        analyzedAt: new Date().toISOString()
      };

      // Cache the result
      this.addToCache(cacheKey, analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * Assess image quality based on various metrics
   * @param {string} imagePath - Path to the image
   * @param {Object} metadata - Sharp metadata
   * @returns {Promise<Object>} Quality assessment
   */
  async assessQuality(imagePath, metadata) {
    try {
      const image = sharp(imagePath);
      const stats = await image.stats();
      
      // Calculate brightness
      const brightness = this.calculateBrightness(stats);
      
      // Calculate contrast
      const contrast = this.calculateContrast(stats);
      
      // Estimate quality score (0-100)
      const qualityScore = this.calculateQualityScore({
        brightness,
        contrast,
        resolution: metadata.width * metadata.height,
        fileSize: (await fs.stat(imagePath)).size
      });

      return {
        score: qualityScore,
        brightness: brightness.toFixed(2),
        contrast: contrast.toFixed(2),
        rating: this.getQualityRating(qualityScore),
        recommendations: this.getQualityRecommendations(qualityScore, brightness, contrast)
      };
    } catch {
      return {
        score: 50,
        brightness: 0,
        contrast: 0,
        rating: 'Unknown',
        recommendations: []
      };
    }
  }

  /**
   * Analyze image content (basic color and pattern analysis)
   * @param {string} imagePath - Path to the image
   * @param {Object} metadata - Sharp metadata
   * @returns {Promise<Object>} Content analysis
   */
  async analyzeContent(imagePath, metadata) {
    try {
      const image = sharp(imagePath);
      const stats = await image.stats();
      
      // Dominant colors
      const dominantColors = this.extractDominantColors(stats);
      
      // Detect image type based on characteristics
      const imageType = this.detectImageType(stats, metadata);
      
      // Color palette
      const palette = await this.extractColorPalette(imagePath, 5);

      return {
        dominantColors,
        palette,
        type: imageType,
        isColorful: this.isColorful(stats),
        isDark: this.isDark(stats),
        isBright: this.isBright(stats)
      };
    } catch {
      return {
        dominantColors: [],
        palette: [],
        type: 'unknown',
        isColorful: false,
        isDark: false,
        isBright: false
      };
    }
  }

  /**
   * Batch analyze multiple images
   * @param {Array<string>} imagePaths - Array of image paths
   * @returns {Promise<Array<Object>>} Array of analysis results
   */
  async batchAnalyze(imagePaths) {
    const results = [];
    
    for (const imagePath of imagePaths) {
      try {
        const analysis = await this.analyzeImage(imagePath);
        results.push(analysis);
      } catch (error) {
        results.push({
          path: imagePath,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Compare two images and return similarity metrics
   * @param {string} imagePath1 - Path to first image
   * @param {string} imagePath2 - Path to second image
   * @returns {Promise<Object>} Comparison results
   */
  async compareImages(imagePath1, imagePath2) {
    try {
      const [analysis1, analysis2] = await Promise.all([
        this.analyzeImage(imagePath1),
        this.analyzeImage(imagePath2)
      ]);

      const similarity = this.calculateSimilarity(analysis1, analysis2);

      return {
        image1: analysis1.filename,
        image2: analysis2.filename,
        similarity: similarity.score,
        isSimilar: similarity.isSimilar,
        differences: similarity.differences,
        recommendation: similarity.recommendation
      };
    } catch (error) {
      throw new Error(`Failed to compare images: ${error.message}`);
    }
  }

  /**
   * Generate a smart thumbnail with optimal quality
   * @param {string} imagePath - Path to the image
   * @param {number} size - Thumbnail size (width and height)
   * @param {string} outputPath - Output path for thumbnail
   * @returns {Promise<string>} Path to generated thumbnail
   */
  async generateSmartThumbnail(imagePath, size = 200, outputPath = null) {
    try {
      if (!outputPath) {
        const ext = path.extname(imagePath);
        const basename = path.basename(imagePath, ext);
        outputPath = path.join(path.dirname(imagePath), `${basename}_thumb${size}${ext}`);
      }

      await sharp(imagePath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  /**
   * Categorize images based on their characteristics
   * @param {Array<string>} imagePaths - Array of image paths
   * @returns {Promise<Object>} Categorized images
   */
  async categorizeImages(imagePaths) {
    const categories = {
      landscape: [],
      portrait: [],
      square: [],
      panoramic: [],
      highQuality: [],
      lowQuality: [],
      dark: [],
      bright: [],
      colorful: []
    };

    for (const imagePath of imagePaths) {
      try {
        const analysis = await this.analyzeImage(imagePath);
        const { dimensions, quality, content } = analysis;

        // Categorize by orientation
        if (dimensions.aspectRatio > 1.5) {
          categories.panoramic.push(imagePath);
        } else if (dimensions.aspectRatio > 1.2) {
          categories.landscape.push(imagePath);
        } else if (dimensions.aspectRatio < 0.8) {
          categories.portrait.push(imagePath);
        } else {
          categories.square.push(imagePath);
        }

        // Categorize by quality
        if (quality.score >= 70) {
          categories.highQuality.push(imagePath);
        } else if (quality.score < 40) {
          categories.lowQuality.push(imagePath);
        }

        // Categorize by brightness
        if (content.isDark) {
          categories.dark.push(imagePath);
        } else if (content.isBright) {
          categories.bright.push(imagePath);
        }

        // Categorize by colorfulness
        if (content.isColorful) {
          categories.colorful.push(imagePath);
        }
      } catch (error) {
        console.error(`Error categorizing ${imagePath}:`, error);
      }
    }

    return categories;
  }

  // Helper methods

  getCacheKey(imagePath) {
    const stats = require('fs').statSync(imagePath);
    return `${imagePath}-${stats.mtimeMs}-${stats.size}`;
  }

  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  calculateBrightness(stats) {
    const { channels } = stats.dominant;
    let totalBrightness = 0;
    let count = 0;

    for (const channel of channels) {
      totalBrightness += channel.mean;
      count++;
    }

    return totalBrightness / count;
  }

  calculateContrast(stats) {
    const { channels } = stats.dominant;
    let totalStdDev = 0;
    let count = 0;

    for (const channel of channels) {
      totalStdDev += channel.stdev;
      count++;
    }

    return totalStdDev / count;
  }

  calculateQualityScore(metrics) {
    let score = 50;

    // Resolution factor (up to 20 points)
    const resolution = metrics.resolution;
    if (resolution >= 20000000) score += 20; // 20MP+
    else if (resolution >= 12000000) score += 15; // 12MP+
    else if (resolution >= 8000000) score += 10; // 8MP+
    else if (resolution >= 4000000) score += 5; // 4MP+

    // Brightness factor (up to 15 points)
    const brightness = metrics.brightness;
    if (brightness >= 100 && brightness <= 180) score += 15;
    else if (brightness >= 80 && brightness <= 200) score += 10;
    else if (brightness >= 60 && brightness <= 220) score += 5;

    // Contrast factor (up to 15 points)
    const contrast = metrics.contrast;
    if (contrast >= 40 && contrast <= 80) score += 15;
    else if (contrast >= 30 && contrast <= 90) score += 10;
    else if (contrast >= 20 && contrast <= 100) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  getQualityRating(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  getQualityRecommendations(score, brightness, contrast) {
    const recommendations = [];

    if (brightness < 80) {
      recommendations.push('Image is too dark - consider brightening');
    } else if (brightness > 200) {
      recommendations.push('Image is too bright - consider darkening');
    }

    if (contrast < 30) {
      recommendations.push('Low contrast - consider enhancing');
    }

    if (score < 50) {
      recommendations.push('Overall quality could be improved');
    }

    return recommendations;
  }

  extractDominantColors(stats) {
    const colors = [];
    const { channels } = stats.dominant;

    if (channels.length >= 3) {
      colors.push({
        r: Math.round(channels[0].mean),
        g: Math.round(channels[1].mean),
        b: Math.round(channels[2].mean),
        hex: this.rgbToHex(
          Math.round(channels[0].mean),
          Math.round(channels[1].mean),
          Math.round(channels[2].mean)
        )
      });
    }

    return colors;
  }

  async extractColorPalette(imagePath, count = 5) {
    try {
      await sharp(imagePath).stats();
      const palette = [];

      // Extract colors from different regions
      const regions = [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 100, height: 100 },
        { left: 0, top: 100, width: 100, height: 100 },
        { left: 100, top: 100, width: 100, height: 100 },
        { left: 50, top: 50, width: 100, height: 100 }
      ];

      for (const region of regions) {
        try {
          const stats = await sharp(imagePath)
            .extract(region)
            .resize(1, 1)
            .raw()
            .toBuffer();

          const r = stats[0];
          const g = stats[1];
          const b = stats[2];

          palette.push({
            r, g, b,
            hex: this.rgbToHex(r, g, b)
          });
        } catch {
          // Skip if region extraction fails
        }
      }

      return palette.slice(0, count);
    } catch {
      return [];
    }
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  detectImageType(stats, metadata) {
    const { width, height } = metadata;
    const aspectRatio = width / height;

    if (aspectRatio > 2) return 'panoramic';
    if (aspectRatio > 1.2) return 'landscape';
    if (aspectRatio < 0.8) return 'portrait';
    return 'square';
  }

  isColorful(stats) {
    const { channels } = stats.dominant;
    if (channels.length < 3) return false;

    const variance = channels.reduce((sum, channel) => {
      return sum + channel.stdev;
    }, 0) / channels.length;

    return variance > 30;
  }

  isDark(stats) {
    const brightness = this.calculateBrightness(stats);
    return brightness < 80;
  }

  isBright(stats) {
    const brightness = this.calculateBrightness(stats);
    return brightness > 180;
  }

  calculateSimilarity(analysis1, analysis2) {
    let similarityScore = 0;
    const differences = [];

    // Compare dimensions
    const sizeDiff = Math.abs(
      analysis1.dimensions.width - analysis2.dimensions.width
    ) + Math.abs(
      analysis1.dimensions.height - analysis2.dimensions.height
    );
    if (sizeDiff < 100) similarityScore += 20;
    else differences.push('Different dimensions');

    // Compare aspect ratio
    const aspectDiff = Math.abs(
      analysis1.dimensions.aspectRatio - analysis2.dimensions.aspectRatio
    );
    if (aspectDiff < 0.1) similarityScore += 20;
    else differences.push('Different aspect ratio');

    // Compare format
    if (analysis1.format === analysis2.format) similarityScore += 10;
    else differences.push('Different format');

    // Compare quality
    const qualityDiff = Math.abs(
      analysis1.quality.score - analysis2.quality.score
    );
    if (qualityDiff < 15) similarityScore += 20;
    else differences.push('Different quality');

    // Compare dominant colors
    if (analysis1.content.dominantColors.length > 0 &&
        analysis2.content.dominantColors.length > 0) {
      const colorDiff = this.colorDistance(
        analysis1.content.dominantColors[0],
        analysis2.content.dominantColors[0]
      );
      if (colorDiff < 50) similarityScore += 30;
      else differences.push('Different colors');
    }

    return {
      score: similarityScore,
      isSimilar: similarityScore >= 60,
      differences,
      recommendation: similarityScore >= 60
        ? 'These images are similar'
        : 'These images are different'
    };
  }

  colorDistance(color1, color2) {
    return Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
    );
  }

  /**
   * Clear the analysis cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      usage: `${((this.cache.size / this.maxCacheSize) * 100).toFixed(1)}%`
    };
  }
}

module.exports = GrokVision;
