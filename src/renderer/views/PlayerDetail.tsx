import { useState } from "react";
import { RosterInfo } from "../../shared/types";
import { AssetPanel } from "./AssetPanel";
import { PixelEditor, type AtlasInfo, type EditorTarget } from "./PixelEditor";

type Position = RosterInfo["positions"][number];

export function PlayerDetail({ position, cacheFolder }: { position: Position; cacheFolder: string }) {
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);

  const openEditor = (atlasInfo: AtlasInfo, url: string, row: number, col: number, onSaved: () => void) => {
    setEditorTarget({ atlasInfo, url, row, col, onSaved });
  };

  return (
    <div>
      <h2 className="mb-3 text-[17px] font-semibold">{position.name}</h2>
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="flex flex-col gap-4">
          <AssetPanel label="Portrait" url={position.urlPortrait} cacheFolder={cacheFolder} />
          <AssetPanel
            label="Iconset"
            url={position.urlIconSet}
            cacheFolder={cacheFolder}
            showAtlasBreakdown
            onOpenEditor={openEditor}
          />
        </div>

        <div className="sticky top-0">
          {editorTarget && (
            <PixelEditor
              target={editorTarget}
              cacheFolder={cacheFolder}
              onDone={() => setEditorTarget(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
