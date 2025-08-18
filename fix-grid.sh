#!/bin/bash

# Fix Grid components in all TypeScript files
echo "Fixing Grid components across the project..."

# Step 1: Remove 'item' prop from all Grid components
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Remove standalone 'item' prop
  sed -i '' 's/<Grid item>/<Grid>/g' "$file"
  sed -i '' 's/<Grid item /<Grid /g' "$file"
  
  # Handle Grid with item and other props on same line
  sed -i '' 's/Grid item xs={12} md={6}/Grid size={{ xs: 12, md: 6 }}/g' "$file"
  sed -i '' 's/Grid item xs={12} md={4}/Grid size={{ xs: 12, md: 4 }}/g' "$file"
  sed -i '' 's/Grid item xs={12} md={3}/Grid size={{ xs: 12, md: 3 }}/g' "$file"
  sed -i '' 's/Grid item xs={12} sm={6} md={4}/Grid size={{ xs: 12, sm: 6, md: 4 }}/g' "$file"
  sed -i '' 's/Grid item xs={12} sm={6}/Grid size={{ xs: 12, sm: 6 }}/g' "$file"
  sed -i '' 's/Grid item xs={12}/Grid size={12}/g' "$file"
  sed -i '' 's/Grid item xs={6}/Grid size={6}/g' "$file"
  sed -i '' 's/Grid item xs={4}/Grid size={4}/g' "$file"
  sed -i '' 's/Grid item xs={3}/Grid size={3}/g' "$file"
  sed -i '' 's/Grid item xs={2}/Grid size={2}/g' "$file"
  sed -i '' 's/Grid item xs={8}/Grid size={8}/g' "$file"
  
  # Fix multiline Grid components with separate props
  perl -i -pe 's/item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}/size={{ xs: $1, md: $2 }}/g' "$file"
  perl -i -pe 's/item\s+xs=\{(\d+)\}/size={$1}/g' "$file"
  
  # Remove remaining item props that might be on their own line
  sed -i '' '/^\s*item$/d' "$file"
  sed -i '' 's/\sitem\s/ /g' "$file"
done

echo "Grid components fixed!"