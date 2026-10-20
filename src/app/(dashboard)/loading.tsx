/**
 * Shown the moment someone navigates, while the page's data is on its way.
 * Same rhythm as a real page (header, then a section of rows) so nothing jumps.
 */
export default function Loading() {
  return (
    <div className="massar-skeleton" aria-busy="true" aria-label="Loading">
      <div className="massar-skel massar-skel-eyebrow" />
      <div className="massar-skel massar-skel-title" />
      <div className="massar-skel massar-skel-line" />
      <div className="massar-skel massar-skel-heading" />
      <div className="massar-skel-section">
        {[0, 1, 2].map(i => (
          <div key={i} className="massar-skel-row">
            <div style={{ flex: 1 }}>
              <div className="massar-skel massar-skel-row-title" />
              <div className="massar-skel massar-skel-row-sub" />
            </div>
            <div className="massar-skel massar-skel-button" />
          </div>
        ))}
      </div>
    </div>
  )
}
