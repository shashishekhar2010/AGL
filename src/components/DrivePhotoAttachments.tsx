import { useState, type KeyboardEvent } from 'react';
import { ExternalLink, Image as ImageIcon, Link2, Plus, Trash2 } from 'lucide-react';
import {
  getDriveThumbnailUrl,
  isValidGoogleDriveUrl,
  type DrivePhotoAttachment,
} from '../utils/driveLinks';

function DriveThumbnailCard({
  item,
  onRemove,
}: {
  item: DrivePhotoAttachment;
  onRemove?: () => void;
}) {
  const thumbUrl = getDriveThumbnailUrl(item.url);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 overflow-hidden flex flex-col">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-[16/10] bg-[#090d13] overflow-hidden group"
      >
        {thumbUrl && !imgFailed ? (
          <img
            src={thumbUrl}
            alt={item.label}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            <ImageIcon className="w-6 h-6 text-[#e8ad26]/70" />
            <span className="text-[10px] font-mono-tech uppercase tracking-[0.1em] text-[#8a968f]">
              Google Drive Link
            </span>
          </div>
        )}
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#05070a]/85 border border-[#dfe7e0]/20 text-[10px] text-[#dfe7e0] opacity-90 group-hover:opacity-100">
          <ExternalLink className="w-2.5 h-2.5 text-[#e8ad26]" />
          Open
        </span>
      </a>

      <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-[#dfe7e0]/10">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          title={item.url}
          className="text-[11px] text-[#dfe7e0] hover:text-[#e8ad26] truncate transition-colors"
        >
          {item.label}
        </a>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.label}`}
            className="text-[#8a968f] hover:text-[#ff6b66] shrink-0 p-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DrivePhotoGallery({
  links,
  emptyLabel = 'No work screenshots attached.',
}: {
  links: DrivePhotoAttachment[];
  emptyLabel?: string;
}) {
  if (!links || links.length === 0) {
    return <p className="text-[11px] text-[#6c7872] italic">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {links.map((item) => (
        <DriveThumbnailCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function DriveLinkEditor({
  links,
  onChange,
}: {
  links: DrivePhotoAttachment[];
  onChange: (next: DrivePhotoAttachment[]) => void;
}) {
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commitLink = (silentIfEmpty = false) => {
    setError(null);
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      if (!silentIfEmpty) setError('Paste a Google Drive link first.');
      return;
    }
    if (!isValidGoogleDriveUrl(trimmedUrl)) {
      setError(
        'Please paste a valid Google Drive link (https://drive.google.com/... or https://photos.google.com/...).'
      );
      return;
    }
    if (links.some((item) => item.url === trimmedUrl)) {
      setUrlInput('');
      setLabelInput('');
      return;
    }
    if (links.length >= 10) {
      setError('Maximum 10 screenshot links per submission.');
      return;
    }

    const nextItem: DrivePhotoAttachment = {
      id: `drv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: labelInput.trim() || `Work Screenshot ${links.length + 1}`,
      url: trimmedUrl,
      addedAt: new Date().toISOString(),
    };

    onChange([...links, nextItem]);
    setUrlInput('');
    setLabelInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitLink(false);
    }
  };

  const handleUrlBlur = () => {
    const trimmed = urlInput.trim();
    if (trimmed && isValidGoogleDriveUrl(trimmed)) {
      commitLink(true);
    }
  };

  const handleRemove = (id: string) => {
    onChange(links.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3 rounded-lg bg-[#06090e] border border-[#dfe7e0]/12 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[#dfe7e0]">
          <Link2 className="w-3.5 h-3.5 text-[#e8ad26]" />
          <span>Work Screenshot Photos (Google Drive Links)</span>
        </div>
        <span className="text-[10px] font-mono-tech text-[#8a968f]">
          {links.length}/10
        </span>
      </div>

      <p className="text-[11px] text-[#8a968f] leading-relaxed">
        Upload your work screenshot to Google Drive, set sharing to &ldquo;Anyone
        with the link&rdquo;, and paste the link below. Valid Drive links are
        attached automatically.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <input
          type="text"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Caption (e.g., Client Order Proof)"
          className="sm:col-span-4 px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
        />
        <input
          type="url"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleUrlBlur}
          placeholder="https://drive.google.com/file/d/..."
          className="sm:col-span-6 px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
        />
        <button
          type="button"
          onClick={() => commitLink(false)}
          className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[#dfe7e0] bg-[#121822] hover:bg-[#e0231c] border border-[#dfe7e0]/15 hover:border-[#e0231c] rounded-md transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/30 rounded px-2.5 py-1.5">
          {error}
        </p>
      )}

      {links.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {links.map((item) => (
            <DriveThumbnailCard
              key={item.id}
              item={item}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
