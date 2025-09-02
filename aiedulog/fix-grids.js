const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all .tsx files with Grid item usage
const files = [
  '/Users/stillclie_mac/Documents/ug/aideulog/aiedulog/src/app/scheduling/confirmation/[appointmentId]/page.tsx'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace Grid item xs={} sm={} pattern with size={{}} pattern
    content = content.replace(/<Grid\s+item\s+xs={(\d+)}\s+sm={(\d+)}>/g, '<Grid size={{ xs: $1, sm: $2 }}>');
    content = content.replace(/<Grid\s+item\s+xs={(\d+)}>/g, '<Grid size={$1}>');
    content = content.replace(/<Grid\s+item\s+sm={(\d+)}>/g, '<Grid size={{ sm: $1 }}>');
    content = content.replace(/<Grid\s+item\s+md={(\d+)}>/g, '<Grid size={{ md: $1 }}>');
    content = content.replace(/<Grid\s+item\s+lg={(\d+)}>/g, '<Grid size={{ lg: $1 }}>');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed Grid usage in: ${filePath}`);
  }
});