import { useState, useRef } from 'react';
import { User, Mail, Phone, MapPin, Globe, Camera, Trash2 } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { PersonalInfo } from '../../../types/resume';

export default function PersonalInfoSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const info = resume?.data?.personalInfo;
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempInfo, setTempInfo] = useState<PersonalInfo>(info!);

  if (!info) return null;

  const handleEdit = () => {
    setTempInfo(info);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateData({ personalInfo: tempInfo });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempInfo(info);
    setIsEditing(false);
  };

  const update = (field: keyof PersonalInfo, value: string) => {
    setTempInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Image must be under 3MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => update('profilePicture', reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="section-body" style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Contact Details</h4>
        {!isEditing ? (
          <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Edit</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: info.photoShape === 'square' ? 8 : info.photoShape === 'rounded' ? 16 : '50%',
            overflow: 'hidden', background: 'var(--bg-app)', border: '1px solid var(--border)'
          }}>
            {info.profilePicture ? (
              <img src={info.profilePicture} alt={info.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="var(--text-muted)" />
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{info.fullName || 'Full Name'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{info.title || 'Professional Title'}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              {info.email && <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {info.email}</div>}
              {info.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {info.phone}</div>}
              {info.location && <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {info.location}</div>}
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Photo + Name Row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Photo Upload */}
        <div style={{ flexShrink: 0 }}>
          <label style={{ marginBottom: 8 }}>Photo</label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 80, height: 80, borderRadius: info.photoShape === 'square' ? 8 : info.photoShape === 'rounded' ? 16 : '50%',
              border: '2px dashed var(--border)', cursor: 'pointer', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-app)', transition: 'border-color 0.15s',
              position: 'relative',
            }}
            title="Click to upload photo"
          >
            {info.profilePicture ? (
              <img src={info.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Camera size={22} color="var(--text-muted)" />
            )}
          </div>
          {info.profilePicture && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <select
                value={info.photoShape || 'circle'}
                onChange={(e) => update('photoShape', e.target.value)}
                style={{ flex: 1, padding: '3px 6px', fontSize: 11 }}
              >
                <option value="circle">Circle</option>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
              <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => update('profilePicture', '')} title="Remove">
                <Trash2 size={12} color="var(--danger)" />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {/* Name & Title */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="form-group">
            <label>Full Name *</label>
            <div className="input-with-icon">
              <User size={14} className="input-icon" />
              <input
                type="text" value={info.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Alex Johnson"
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Professional Title *</label>
            <input
              type="text" value={info.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </div>
        </div>
      </div>

      {/* Contact Grid */}
      <div className="form-row">
        <div className="form-group">
          <label>Email *</label>
          <div className="input-with-icon">
            <Mail size={14} className="input-icon" />
            <input type="email" value={info.email} onChange={(e) => update('email', e.target.value)} placeholder="alex@email.com" style={{ paddingLeft: 32 }} />
          </div>
          {info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email) && (
            <span style={{ fontSize: 11, color: 'var(--danger)' }}>⚠ Invalid email</span>
          )}
        </div>
        <div className="form-group">
          <label>Phone</label>
          <div className="input-with-icon">
            <Phone size={14} className="input-icon" />
            <input type="tel" value={info.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1 (555) 000-0000" style={{ paddingLeft: 32 }} />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Location</label>
        <div className="input-with-icon">
          <MapPin size={14} className="input-icon" />
          <input type="text" value={info.location} onChange={(e) => update('location', e.target.value)} placeholder="San Francisco, CA" style={{ paddingLeft: 32 }} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>LinkedIn</label>
          <div className="input-with-icon">
            <Globe size={14} className="input-icon" />
            <input type="text" value={info.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="linkedin.com/in/you" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        <div className="form-group">
          <label>GitHub</label>
          <div className="input-with-icon">
            <Globe size={14} className="input-icon" />
            <input type="text" value={info.github} onChange={(e) => update('github', e.target.value)} placeholder="github.com/you" style={{ paddingLeft: 32 }} />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Portfolio / Website</label>
        <div className="input-with-icon">
          <Globe size={14} className="input-icon" />
          <input type="text" value={tempInfo.portfolio} onChange={(e) => update('portfolio', e.target.value)} placeholder="yoursite.com" style={{ paddingLeft: 32 }} />
        </div>
      </div>
      </>
      )}
    </div>
  );
}
