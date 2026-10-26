# News/event project selection correction

Reported: checking UNFRAME JOURNAL failed with “프로젝트를 UP, 음, U#, U.A.U 중에서 선택해주세요”, but no obvious project picker existed.

Cause: `project` was a free-text input linked to a datalist. The model and Firestore publication rules accepted only the four canonical project values for published news or JOURNAL items. A name such as UNFRAME SALON was retained as arbitrary text, then rejected on save.

Correction: native dropdown, exact saved category values, explicit legacy custom input, dynamic required/invalid guidance alongside the field, and a list-toggle recovery path into the classification editor. Existing event title, image and other values are preserved. Direct custom names remain valid for legacy events without JOURNAL exposure, as before. Taxonomy and database authorization are unchanged; do not assign SALON to another project without owner direction.

Verification: canonical-category and custom/draft validation tests, escaped source input, real demo editor save/reopen with JOURNAL selected, and on-field guidance for a custom name when publication is checked. Production event records and uploaded media were not modified by this task.

## Confirmed follow-up: SALON

Owner confirmed UNFRAME SALON is a separate project. The shared frontend canonical list, administrator introductory copy, homepage JOURNAL eligibility and Firestore validHighlight allowlist now support exact `UNFRAME SALON`. Existing records using that exact name restore as the canonical dropdown option. No record was reassigned or automatically published; staff still select JOURNAL and save the event normally.

Main-based checks:161 unit tests, JS syntax, build, Firebase rule compilation and live-rule source verification. The changed deployed rules differed from the previous live source only by the added project allowlist value. Isolated emulator assertions were added for SALON news/events; running them was unavailable because this machine has no Java runtime. No Java installation was attempted.
