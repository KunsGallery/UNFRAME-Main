# Snoopy and Woodstock in VW Bus — finished product detail

Applied to the staff-only `products/imweb-2` product and `/shop-preview/imweb-2`.

Display order:
1. detail-01-introduction.png — original finished introductory chapter
2. detail-02-artist.png — new Death NYC artist interlude
3. detail-03-details-and-room.png — original detail and interior chapter
4. detail-04-purchase.png — original specifications and purchase chapter

The original three numbered chapters keep their printed numbering; the artist page is an unnumbered insert. All original source photographs remain in the product document. Finished images use the existing `[DETAIL] ` image description role and private R2 product paths. The actual purchase link remains `https://unframe.imweb.me/shop/?idx=2`.

Artist biography reference: https://www.artsy.net/artist/death-nyc (checked 2026-10-17 Asia/Seoul). The new page paraphrases the artist's New York origin, use of pop-culture/art-history imagery and anonymity; it quotes only the eight-word expansion of DEATH. The work-specific paragraph is UNFRAME's visual interpretation, not a claimed artist quotation. No invented portrait, studio, awards or signature evidence. Existing price, edition and product composition remain from the existing catalog; no unverified size is added.

These are generated design graphics, including artwork representations and interior staging; original product photographs remain the source for exact artwork inspection. Do not use a generated illustration as condition, signature or authenticity evidence. Review original photographs and catalog data before changing commercial information.

Created with the built-in image-generation tool. Prompt for the new artist page: [artist-prompt.md](artist-prompt.md).


## Imported text and wider presentation (2026-10-17)

The original Imweb product detail is already imported into `products/imweb-2.details`; importing does not reconstruct a pixel-identical page or continuously synchronize later storefront edits. The finished-image renderer now places the original `The Concept` text after the first graphic, and the `Authenticity` / purchase-check text before the last graphic. Heading matching requires an actual heading line so the phrase “Certificate of Authenticity” in the COA description cannot start the wrong excerpt. No imported HTML executes. A collapsed “기존 상품 상세정보 전체 보기” preserves access to the complete imported copy, including shipping and return conditions.

Confirmed source information includes edition of 100, fixed 21/100 number, signature/numbering, COA and gold seal, included frame, dispatch in 2–5 weekdays and pickup within nine days. The existing verified artist graphic is retained; unverified source auction/promotional claims are not rewritten into the new editorial biography. No size or official collaboration is invented.

Finished product content now has a 1,280px maximum width with 32px side gutters; under 700px it uses the available width and the added text stacks in one column. Desktop 1,920px layout measured 1,280px; mobile 390px layout measured 390px without horizontal overflow. The four approved graphics and their private R2 metadata are unchanged. This is a renderer update, so no Firestore write or rule change is needed.
