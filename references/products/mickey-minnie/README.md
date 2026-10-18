# Mickey and Minnie with Kusama — long-form product detail

Applied native renderer: `site/js/mickey-product-view.js`, selected for staff-only `/shop-preview/imweb-1` when no explicitly marked finished image design overrides it. This uses the original product photographs already stored in private R2; no artwork is regenerated. The screenshots split the implemented long page into artwork/artist and context/purchase chapters. Room photographs were already supplied by the original product and remain explicitly labeled as staging, not scale evidence.

Source product details confirm AP (Artist Proof), print on 300gsm fine-art paper, pencil signature, frame, COA card/gold seal and reference price200,000KRW. Unknown dimensions are not invented. No AP run size, auction performance, investment benefit or official collaboration is claimed. Original full description stays available in a disclosure, HTML-escaped. Key FAQ answers open by default. Facts with no matching source indicator are omitted; source update/removal tests cover this behavior.

Artist biography reference: https://www.artsy.net/artist/death-nyc (previously verified in this project). Paraphrases New York origin, anonymity and use of pop-culture/art-history motifs. Artwork interpretation is labeled as UNFRAME's viewing guidance, not an artist quotation.

An image-generation attempt was rejected by the image tool. The delivered solution is a native webpage with unmodified source photos, captured through the browser; no alternate image model or policy bypass was attempted.

Global live purchase actions now say 구매하기, retaining checkout URLs. The two legacy image-specific CTA regions on the live pen and Snoopy design are covered by actual blue links named 구매하기. Positions are bound to exact approved R2 image paths, not applied to arbitrary future uploads. New artwork uses a normal native link.

Verification: actual imported-data fixture at1024px and390px, no mobile horizontal overflow, two desktop chapter screenshots and full mobile screenshot;74 tests, JS syntax and build pass. Independent finish review passed after single-image fallback and heading-metadata refinements. Staff authentication, private R2 access and Firestore rules/data are unchanged.
