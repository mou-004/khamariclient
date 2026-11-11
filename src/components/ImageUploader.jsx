import { useRef, useState } from 'react';
import { ImagePlus, Link2, Star, X } from 'lucide-react';
import { uploadProductImage } from '../api.js';

// Multi-picture field for the product form. `images` is an array of URLs; the first one is the cover.
export default function ImageUploader({ images, onChange, onError, max = 8 }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const [link, setLink] = useState('');

  const addFiles = async (fileList) => {
    const files = [...fileList].slice(0, max - images.length);
    if (!files.length) { onError?.(`You can add up to ${max} pictures.`); return; }
    setBusy(files.length);
    const added = [];
    for (const file of files) {
      try { added.push(await uploadProductImage(file)); } catch (e) { onError?.(e.message); }
      setBusy((n) => n - 1);
    }
    if (added.length) onChange([...images, ...added]);
    if (input.current) input.current.value = '';
  };
  const addLink = () => {
    if (!/^https?:\/\/\S+$/.test(link.trim())) { onError?.('Paste a full picture link starting with https://'); return; }
    if (images.length >= max) { onError?.(`You can add up to ${max} pictures.`); return; }
    onChange([...images, link.trim()]); setLink('');
  };
  const makeCover = (i) => onChange([images[i], ...images.filter((_, n) => n !== i)]);

  return <div className="uploader">
    <div className="uploader-grid">
      {images.map((src, i) => <div className={`uploader-item ${i === 0 ? 'cover' : ''}`} key={src + i}>
        <img src={src} alt={`Product picture ${i + 1}`} />
        {i === 0 ? <span className="uploader-tag">Cover</span> : <button type="button" className="uploader-star" title="Make cover picture" onClick={() => makeCover(i)}><Star size={13} /></button>}
        <button type="button" className="uploader-remove" title="Remove picture" onClick={() => onChange(images.filter((_, n) => n !== i))}><X size={13} /></button>
      </div>)}
      {Array.from({ length: busy }).map((_, i) => <div className="uploader-item uploader-busy" key={`b${i}`}><span>Uploading…</span></div>)}
      {images.length + busy < max && <button type="button" className="uploader-add" onClick={() => input.current?.click()}><ImagePlus size={22} /><b>Add pictures</b><small>JPG, PNG or WebP</small></button>}
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
    <div className="uploader-link"><Link2 size={15} /><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste a picture link (https://)" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} /><button type="button" className="portal-secondary" onClick={addLink}>Add</button></div>
    <small className="uploader-hint">The first picture is the cover shown in the shop. Customers can browse all {max} pictures on the product page.</small>
  </div>;
}