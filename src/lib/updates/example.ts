/**
 * Example Usage of Update Notification System
 * 
 * This file demonstrates how to use the various components and functions
 * in the update notification system.
 */

import { 
  getRecentUpdates, 
  getUpdatesByCategory, 
  getUpdateStats,
  getUpdatesByDateRange,
  type PRUpdate 
} from '@/lib/updates';

// Example 1: Get Recent Updates
console.log('=== Example 1: Recent Updates ===');
const recentUpdates = getRecentUpdates(5);
console.log(`Found ${recentUpdates.length} recent updates:`);
recentUpdates.forEach(update => {
  console.log(`#${update.number}: ${update.title} (${update.category})`);
});

// Example 2: Get Updates by Category
console.log('\n=== Example 2: Updates by Category ===');
const categories = getUpdatesByCategory();
console.log(`Total categories: ${categories.size}`);
categories.forEach((updates, category) => {
  console.log(`${category}: ${updates.length} updates`);
});

// Example 3: Get Statistics
console.log('\n=== Example 3: Statistics ===');
const stats = getUpdateStats();
console.log(`Total PRs: ${stats.total}`);
console.log(`Merged: ${stats.merged}`);
console.log(`By Category:`);
Object.entries(stats.byCategory).forEach(([category, count]) => {
  console.log(`  ${category}: ${count}`);
});
console.log(`Date Range: ${stats.dateRange.start} to ${stats.dateRange.end}`);

// Example 4: Filter by Date Range
console.log('\n=== Example 4: Filter by Date Range ===');
const feb7Updates = getUpdatesByDateRange('2026-02-07', '2026-02-07');
console.log(`Updates on 2026-02-07: ${feb7Updates.length}`);
feb7Updates.forEach(update => {
  console.log(`  #${update.number}: ${update.title}`);
});

// Example 5: Get Feature Updates Only
console.log('\n=== Example 5: Feature Updates Only ===');
const features = categories.get('feature') || [];
console.log(`Total feature updates: ${features.length}`);
features.slice(0, 5).forEach(update => {
  console.log(`#${update.number}: ${update.title}`);
  if (update.highlights) {
    update.highlights.forEach(highlight => {
      console.log(`  - ${highlight}`);
    });
  }
});

// Example 6: Latest Update
console.log('\n=== Example 6: Latest Update ===');
const latest = getRecentUpdates(1)[0];
if (latest) {
  console.log(`PR #${latest.number}: ${latest.title}`);
  console.log(`Category: ${latest.category}`);
  console.log(`Date: ${latest.date}`);
  console.log(`Description: ${latest.description}`);
  if (latest.highlights) {
    console.log('Highlights:');
    latest.highlights.forEach(h => console.log(`  - ${h}`));
  }
}

export {};
