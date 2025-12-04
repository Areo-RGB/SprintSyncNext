#!/usr/bin/env node

/**
 * TypeScript Pro Bundle Analysis Script
 * Analyzes the Next.js bundle for performance insights and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { gzipSync, brotliCompressSync } = require('zlib');

const ANALYZE_DIR = path.join(process.cwd(), '.next', 'analyze');
const BUILD_DIR = path.join(process.cwd(), '.next');

// Ensure analysis directory exists
if (!fs.existsSync(ANALYZE_DIR)) {
  fs.mkdirSync(ANALYZE_DIR, { recursive: true });
}

/**
 * Calculate file sizes for different compression methods
 */
function getFileSizes(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const raw = content.length;
    const gzipped = gzipSync(content).length;
    const brotli = brotliCompressSync(content).length;

    return {
      raw,
      gzipped,
      brotli,
      rawHuman: formatBytes(raw),
      gzippedHuman: formatBytes(gzipped),
      brotliHuman: formatBytes(brotli),
    };
  } catch (error) {
    console.warn(`Could not read file: ${filePath}`, error.message);
    return null;
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Analyze static chunks
 */
function analyzeStaticChunks() {
  const staticDir = path.join(BUILD_DIR, 'static', 'chunks');
  const analysis = {
    totalChunks: 0,
    totalSize: 0,
    totalGzipped: 0,
    totalBrotli: 0,
    chunks: [],
    largestChunks: [],
  };

  if (!fs.existsSync(staticDir)) {
    console.warn('Static chunks directory not found');
    return analysis;
  }

  const files = fs.readdirSync(staticDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(staticDir, file);
      const sizes = getFileSizes(filePath);

      if (sizes) {
        return {
          name: file,
          path: filePath,
          ...sizes,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.raw - a.raw);

  analysis.chunks = files;
  analysis.totalChunks = files.length;
  analysis.totalSize = files.reduce((sum, chunk) => sum + chunk.raw, 0);
  analysis.totalGzipped = files.reduce((sum, chunk) => sum + chunk.gzipped, 0);
  analysis.totalBrotli = files.reduce((sum, chunk) => sum + chunk.brotli, 0);
  analysis.largestChunks = files.slice(0, 10);

  return analysis;
}

/**
 * Analyze pages (static and server)
 */
function analyzePages() {
  const pagesDir = path.join(BUILD_DIR, 'server', 'pages');
  const analysis = {
    totalPages: 0,
    staticPages: 0,
    dynamicPages: 0,
    pages: [],
  };

  if (!fs.existsSync(pagesDir)) {
    console.warn('Pages directory not found');
    return analysis;
  }

  function scanDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanDirectory(itemPath, prefix + item + '/');
      } else if (item.endsWith('.js') || item.endsWith('.html')) {
        const isStatic = item.endsWith('.html');
        const pageName = prefix + (item.replace(/\.(js|html)$/, '')) || '/';

        analysis.pages.push({
          name: pageName,
          static: isStatic,
          path: itemPath,
          sizes: getFileSizes(itemPath),
        });

        analysis.totalPages++;
        if (isStatic) {
          analysis.staticPages++;
        } else {
          analysis.dynamicPages++;
        }
      }
    });
  }

  scanDirectory(pagesDir);
  return analysis;
}

/**
 * Analyze dependencies and potential optimizations
 */
function analyzeDependencies() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const analysis = {
    totalDependencies: 0,
    devDependencies: 0,
    prodDependencies: 0,
    largeDependencies: [],
    optimizationSuggestions: [],
  };

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    analysis.prodDependencies = Object.keys(packageJson.dependencies || {}).length;
    analysis.devDependencies = Object.keys(packageJson.devDependencies || {}).length;
    analysis.totalDependencies = Object.keys(allDeps).length;

    // Check for potentially large dependencies
    const largeDepPattern = /react-dom|moment|lodash|@firebase|@next/;
    analysis.largeDependencies = Object.keys(allDeps)
      .filter(dep => largeDepPattern.test(dep))
      .map(dep => ({
        name: dep,
        isDev: !packageJson.dependencies[dep],
      }));

    // Generate optimization suggestions
    if (packageJson.dependencies?.moment) {
      analysis.optimizationSuggestions.push({
        type: 'dependency',
        severity: 'high',
        message: 'Consider replacing moment.js with date-fns or dayjs for smaller bundle size',
      });
    }

    if (packageJson.dependencies?.lodash) {
      analysis.optimizationSuggestions.push({
        type: 'dependency',
        severity: 'medium',
        message: 'Consider using lodash-webpack-plugin or importing specific lodash functions',
      });
    }

    if (analysis.prodDependencies > 50) {
      analysis.optimizationSuggestions.push({
        type: 'dependency',
        severity: 'medium',
        message: 'High number of production dependencies. Consider removing unused packages.',
      });
    }

  } catch (error) {
    console.warn('Could not analyze dependencies:', error.message);
  }

  return analysis;
}

/**
 * Generate comprehensive bundle report
 */
function generateBundleReport() {
  console.log('🔍 Analyzing Next.js bundle...\n');

  const staticChunks = analyzeStaticChunks();
  const pages = analyzePages();
  const dependencies = analyzeDependencies();

  const report = {
    timestamp: new Date().toISOString(),
    buildSize: {
      totalRaw: staticChunks.totalSize,
      totalGzipped: staticChunks.totalGzipped,
      totalBrotli: staticChunks.totalBrotli,
      totalRawHuman: formatBytes(staticChunks.totalSize),
      totalGzippedHuman: formatBytes(staticChunks.totalGzipped),
      totalBrotliHuman: formatBytes(staticChunks.totalBrotli),
    },
    staticChunks,
    pages,
    dependencies,
    recommendations: generateRecommendations(staticChunks, pages, dependencies),
  };

  // Save detailed analysis
  fs.writeFileSync(
    path.join(ANALYZE_DIR, 'bundle-analysis.json'),
    JSON.stringify(report, null, 2)
  );

  // Print summary to console
  printSummary(report);

  return report;
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(chunks, pages, deps) {
  const recommendations = [];

  // Bundle size recommendations
  if (chunks.totalSize > 1024 * 1024) { // > 1MB
    recommendations.push({
      category: 'bundle-size',
      severity: 'high',
      message: 'Bundle size exceeds 1MB. Consider code splitting and tree shaking.',
    });
  }

  // Chunk analysis
  const largeChunks = chunks.largestChunks.filter(chunk => chunk.raw > 100 * 1024); // > 100KB
  if (largeChunks.length > 0) {
    recommendations.push({
      category: 'large-chunks',
      severity: 'medium',
      message: `${largeChunks.length} chunks exceed 100KB. Consider dynamic imports.`,
      chunks: largeChunks.map(chunk => ({
        name: chunk.name,
        size: chunk.rawHuman,
      })),
    });
  }

  // Page optimization
  const heavyPages = pages.pages.filter(page =>
    page.sizes && page.sizes.raw > 50 * 1024 // > 50KB
  );

  if (heavyPages.length > 0) {
    recommendations.push({
      category: 'page-optimization',
      severity: 'medium',
      message: `${heavyPages.length} pages exceed 50KB. Consider component-level code splitting.`,
      pages: heavyPages.map(page => ({
        name: page.name,
        size: page.sizes.rawHuman,
      })),
    });
  }

  // Dependency optimization
  recommendations.push(...deps.optimizationSuggestions);

  // Performance recommendations
  recommendations.push(
    {
      category: 'performance',
      severity: 'low',
      message: 'Enable gzip and brotli compression for optimal performance.',
    },
    {
      category: 'performance',
      severity: 'low',
      message: 'Consider using next/dynamic for heavy components.',
    },
    {
      category: 'performance',
      severity: 'low',
      message: 'Implement bundle analyzer in CI/CD pipeline.',
    }
  );

  return recommendations.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Print analysis summary to console
 */
function printSummary(report) {
  console.log('📊 Bundle Analysis Summary\n');

  // Build size overview
  console.log('🏗️  Build Size:');
  console.log(`   Raw: ${report.buildSize.totalRawHuman}`);
  console.log(`   Gzipped: ${report.buildSize.totalGzippedHuman}`);
  console.log(`   Brotli: ${report.buildSize.totalBrotliHuman}`);
  console.log(`   Chunks: ${report.staticChunks.totalChunks}`);

  console.log('\n📄 Pages:');
  console.log(`   Total: ${report.pages.totalPages}`);
  console.log(`   Static: ${report.pages.staticPages}`);
  console.log(`   Dynamic: ${report.pages.dynamicPages}`);

  console.log('\n📦 Dependencies:');
  console.log(`   Total: ${report.dependencies.totalDependencies}`);
  console.log(`   Production: ${report.dependencies.prodDependencies}`);
  console.log(`   Development: ${report.dependencies.devDependencies}`);

  // Largest chunks
  if (report.staticChunks.largestChunks.length > 0) {
    console.log('\n🔍 Largest Chunks:');
    report.staticChunks.largestChunks.slice(0, 5).forEach((chunk, index) => {
      console.log(`   ${index + 1}. ${chunk.name}: ${chunk.rawHuman} (${chunk.gzippedHuman} gzipped)`);
    });
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} ${index + 1}. [${rec.category.toUpperCase()}] ${rec.message}`);

      if (rec.chunks) {
        rec.chunks.forEach(chunk => {
          console.log(`      - ${chunk.name}: ${chunk.size}`);
        });
      }

      if (rec.pages) {
        rec.pages.forEach(page => {
          console.log(`      - ${page.name}: ${page.size}`);
        });
      }
    });
  }

  console.log('\n📈 Detailed report saved to:', path.join(ANALYZE_DIR, 'bundle-analysis.json'));
}

// Run the analysis
if (require.main === module) {
  try {
    generateBundleReport();
    console.log('\n✅ Bundle analysis completed successfully!');
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateBundleReport,
  analyzeStaticChunks,
  analyzePages,
  analyzeDependencies,
};