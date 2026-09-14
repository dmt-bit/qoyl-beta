// Required at the top of every baby profile form and routine page - see
// item 7 of the family-profiles spec. Kept as its own component (rather
// than inline copy in each place) so the wording only lives in one spot.
export default function BabyMedicalDisclaimer() {
  return (
    <div className="border border-bronze/40 bg-white px-4 py-3 text-sm leading-relaxed text-dark/90">
      Qoyl&apos;s baby recommendations are for cosmetic hair and scalp care only. They are not
      medical advice. If your baby has persistent scalp issues, skin reactions, or hair concerns,
      please consult your pediatrician or a pediatric dermatologist.
    </div>
  );
}
