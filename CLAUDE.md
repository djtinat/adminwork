# Camp Spinoff Admin Workspace

This repo handles admin automation for Camp Spinoff (campspinoff.com).
Owner: Tina T., Founder.

---

## Active Projects

### 1. Sponsor Email Outreach
Weekly sponsor pitch emails to Las Vegas law firms.
Templates live in `sponsor-emails/templates.md`.
A new weekly draft file (e.g. `sponsor-emails/2026-04-12.md`) gets created each Sunday with 4 Gmail drafts.

**To generate this week's emails:** "Create this week's sponsor drafts"
I will create 4 Gmail drafts using the 4 templates and generate a new weekly file in the repo.

### 2. Scholarship Application Intake
Google Apps Script that watches Gmail for scholarship application emails and pipes them into a Google Sheet.
Working script lives in `scholarship-intake/applications.gs`.

**To set up a new intake form:**
Just say "I have a new form" and share a test email or screenshot.
I will follow this pattern automatically:
1. Run `debugEmail()` to read the exact section headers and field names from the email
2. Update the field arrays and headers to match
3. Generate the complete Apps Script ready to paste into script.google.com

**How the pattern works:**
- Emails have ALL CAPS section headers (e.g. CAMPER INFORMATION, PARENT / GUARDIAN)
- Fields within each section run together inline: `Name John Doe Date of Birth 01/01/2010...`
- The script uses known field names as delimiters to split out each value
- Each section becomes a group of columns in the sheet
- Always run `debugEmail()` first on a test submission to verify exact field names before going live

---

## Camp Spinoff Details

**What it is:** Nonprofit sleep away summer camp for teens ages 12-17.
Campers learn DJ, music production, and music business alongside traditional camp activities (hiking, archery, campfires, color war, s'mores, arts and crafts).

**Mission:** Create access for students who have a passion for music and want to experience the great outdoors.

**2026 Session:** July 19-23, Alamo, Nevada. First year back after a 10-year run in Los Angeles (shut down by COVID).

**Sponsorship Packages:**
- $1,500: One scholarship (sends one camper to camp)
- $5,000: Full branding and partnership benefits plus three camp scholarships

**Email tone:** Short, sweet, warm, conversational, professional but campy. No emojis. No hyphens.
**Signature:** Tina T. / Founder, CampSpinoff.com
**Cold email goal:** Get a call, not close a deal. No pricing in cold outreach.
