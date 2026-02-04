const db = require('./database');
const fs = require('fs');
const path = require('path');

// Helper to clean up after test
// We assume we are running this with a FRESH db because we can't easily swap the db path in the required module
// So we will just add unique data

async function testWorkflows() {
    console.log("Starting Workflow Verification...");

    const timestamp = Date.now();
    const customerId = `cust_${timestamp}`;

    try {
        // 1. Create Customer
        console.log(`[TEST] Creating Customer: ${customerId}`);
        db.saveCustomer({
            id: customerId,
            name: "Test Customer",
            active: true,
            orderIndex: 0,
            initialBalance: 1000
        });

        const customers = db.getCustomers();
        const savedCust = customers.find(c => c.id === customerId);
        if (!savedCust) throw new Error("Customer not saved!");
        console.log("✅ Customer Creation Verified");

        // 2. Initial Entry Generation (Day 1)
        const day1 = '2024-01-01';
        console.log(`[TEST] Retrieving Entries for ${day1}`);
        let entriesDay1 = db.getEntries(day1);
        let entryDay1 = entriesDay1.find(e => e.customerId === customerId);

        // Should auto-create with initial balance
        if (entryDay1.openingBalance !== 1000) throw new Error(`Day 1 opening balance wrong. Expected 1000, got ${entryDay1.openingBalance}`);
        console.log("✅ Initial Balance Inheritance Verified");

        // 3. Update Day 1 Transaction
        console.log(`[TEST] Updating Day 1: Credit 500`);
        entryDay1 = { ...entryDay1, credit: 500, debit: 0 };
        db.saveEntry(entryDay1);

        // Verify DB update
        const freshEntryDay1 = db.getEntries(day1).find(e => e.customerId === customerId);
        if (freshEntryDay1.closingBalance !== 1500) throw new Error(`Day 1 closing balance wrong. Expected 1500, got ${freshEntryDay1.closingBalance}`);
        console.log("✅ Transaction Update Verified");

        // 4. Future Propagation (Day 2)
        const day2 = '2024-01-02';
        console.log(`[TEST] Checking Day 2 (Future)`);
        // First access to Day 2 should auto-create entry based on Day 1 Closing
        let entriesDay2 = db.getEntries(day2);
        let entryDay2 = entriesDay2.find(e => e.customerId === customerId);

        if (entryDay2.openingBalance !== 1500) throw new Error(`Day 2 opening balance wrong. Expected 1500, got ${entryDay2.openingBalance}`);
        console.log("✅ Forward Creation Verified");

        // 5. Backdating (Modifying Day 1 should update Day 2)
        console.log(`[TEST] Backdating: Modifying Day 1 (Add Debit 200)`);
        // Day 1: Open 1000, Credit 500, Debit 200 => Close 1300
        db.saveEntry({ ...freshEntryDay1, debit: 200 });

        // Check Day 2 again. It should have been updated AUTOMATICALLY by the logic in saveEntry
        // Note: getEntries(day2) reads from DB, so it should reflect the update
        const freshEntryDay2 = db.getEntries(day2).find(e => e.customerId === customerId);

        if (freshEntryDay2.openingBalance !== 1300) {
            throw new Error(`Forward Chaining Failed! Day 2 Opening is ${freshEntryDay2.openingBalance}, expected 1300`);
        }
        console.log("✅ Forward Chaining (Back-dating update) Verified");

        console.log("\nALL WORKFLOWS PASSED SUCCESSFULLY");

    } catch (err) {
        console.error("\n❌ WORKFLOW FAILED");
        console.error(err);
        process.exit(1);
    }
}

testWorkflows();
