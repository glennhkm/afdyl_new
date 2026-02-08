const fs = require('fs');
const path = require('path');

// SVG template for PWA icon
const createSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#C98151;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E37100;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="${size/2}" y="${size * 0.65}" font-family="Arial, sans-serif" font-size="${size * 0.55}" font-weight="bold" fill="white" text-anchor="middle">أ</text>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for each size
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

console.log('\nSVG icons generated successfully!');
console.log('Note: For production, convert these SVGs to PNG using a tool like:');
console.log('- sharp (npm package)');
console.log('- ImageMagick');
console.log('- Online converter like https://cloudconvert.com/svg-to-png');
