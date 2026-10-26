# News/event project selection correction

Reported: checking UNFRAME JOURNAL failed with “프로젝트를 UP, 음, U#, U.A.U 중에서 선택해주세요”, but no obvious project picker existed.

Cause: `project` was a free-text input linked to a datalist. The model and Firestore publication rules accepted only the four canonical project values for published news or JOURNAL items. A name such as UNFRAME SALON was retained as arbitrary text, then rejected on save.

Correction: native dropdown, exact saved category values, explicit legacy custom input, dynamic required/invalid guidance alongside the field, and a list-toggle recovery path into the classification editor. Existing event title, image and other values are preserved. Direct custom names remain valid for legacy events without JOURNAL exposure, as before. Taxonomy and database authorization are unchanged; do not assign SALON to another project without owner direction.

Verification: canonical-category and custom/draft validation tests, escaped source input, real demo editor save/reopen with JOURNAL selected, and on-field guidance for a custom name when publication is checked. Production event records and uploaded media were not modified by this task.
