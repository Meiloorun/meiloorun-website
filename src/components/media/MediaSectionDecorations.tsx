import { DecorativeImage } from '../ui/DecorativeImage';

/** Small marks sit in section padding, away from tracker entries and controls. */
export function MediaSectionDecorations({ mark = '/images/deco-11.svg', flip = false }: {
  mark?: string; flip?: boolean;
}) {
  return <>
    <DecorativeImage src={mark} placement="top-right" width="76px" offsetX="-8px" offsetY="8px" rotation={flip ? -14 : 14} opacity={0.55}
      mobile={{ width: '38px', offsetX: '0px', offsetY: '4px', opacity: 0.25 }} />
    <DecorativeImage src="/images/deco-9.svg" placement="bottom-left" width="130px" offsetX="-65px" offsetY="22px" rotation={flip ? 20 : -20} flipX={flip} opacity={0.35}
      mobile={{ width: '70px', offsetX: '-42px', offsetY: '12px', opacity: 0.2 }} />
  </>;
}
