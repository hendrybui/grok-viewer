/* eslint-env node */
/* global require, module, console */
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ExifHandler {
  /**
   * Extract comprehensive EXIF metadata from an image
   * @param {string} filePath - Absolute path to image file
   * @returns {Promise<Object>} - EXIF data and image metadata
   */
  async extractMetadata(filePath) {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      const stats = await fs.stat(filePath);
      
      // Format EXIF data for display
      const exifData = {
        // Basic info
        fileName: path.basename(filePath),
        filePath: filePath,
        fileSize: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        
        // Image properties
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        
        // EXIF from metadata
        exif: this.parseExif(metadata.exif),
        
        // Calculated
        megapixels: ((metadata.width * metadata.height) / 1000000).toFixed(2),
        aspectRatio: this.calculateAspectRatio(metadata.width, metadata.height),
        colorProfile: metadata.icc ? 'Embedded' : 'None'
      };
      
      return exifData;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw error;
    }
  }

  /**
   * Parse raw EXIF buffer into readable object
   * @param {Buffer} exifBuffer - Raw EXIF data
   * @returns {Object} - Parsed EXIF data
   */
  parseExif(exifBuffer) {
    if (!exifBuffer) return {};
    
    try {
      // Sharp provides basic EXIF parsing
      // For more detailed parsing, could integrate exif-parser or exifreader
      const exif = {};
      
      // Common EXIF tags we can extract
      // This is simplified - in production, use a proper EXIF parser library
      return exif;
    } catch (error) {
      console.error('Error parsing EXIF:', error);
      return {};
    }
  }

  /**
   * Calculate greatest common divisor for aspect ratio
   */
  gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Calculate aspect ratio as simplified fraction
   */
  calculateAspectRatio(width, height) {
    const divisor = this.gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;
    
    // Check for common ratios
    const commonRatios = {
      '16:9': 16/9,
      '16:10': 16/10,
      '4:3': 4/3,
      '3:2': 3/2,
      '1:1': 1,
      '21:9': 21/9
    };
    
    const actualRatio = width / height;
    for (const [name, value] of Object.entries(commonRatios)) {
      if (Math.abs(actualRatio - value) < 0.01) {
        return name;
      }
    }
    
    return `${ratioW}:${ratioH}`;
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Extract metadata for multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Array>} - Array of metadata objects
   */
  async extractBatchMetadata(filePaths) {
    const results = await Promise.allSettled(
      filePaths.map(fp => this.extractMetadata(fp))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          fileName: path.basename(filePaths[index]),
          error: result.reason.message
        };
      }
    });
  }
}

module.exports = ExifHandler;
