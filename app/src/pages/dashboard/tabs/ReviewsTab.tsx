import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, AlertCircle, Star, Gift, Ticket, Send, Tag,
  DollarSign, Globe, Settings, Coffee, BarChart3, TrendingUp, CalendarDays,
  Clock, Shield, Building2, Percent, MessageSquare, QrCode, Link2, CreditCard,
  MapPin, Briefcase, Edit2, Trash2, GripVertical, Download, ChevronDown,
  ChevronUp, Monitor, Smartphone, RefreshCw, Bell, Eye, EyeOff, CheckCircle,
  Users, PieChart as PieChartIcon, Circle,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import QRCode from 'qrcode';
import { SetupChecklist } from '@/components/SetupChecklist';
import { DS, getMonday, addWeekDays, WEEK_DAYS, TemplatePreviewCard, ImageUpload, SortableMenuRow, TabletPinSection } from '../shared';


export function ReviewsTab({ venueId }: { venueId: number }) {
  const utils = trpc.useUtils();
  const { data: reviewsList, isLoading } = trpc.venue.listReviews.useQuery(
    { venueId, limit: 100 },
    { enabled: !!venueId }
  );

  const pageHeader = (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
        Reviews
      </h1>
      <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
        Customer ratings and feedback.
      </p>
    </div>
  );

  if (isLoading) return <div>{pageHeader}<p style={DS.emptyState}>Loading reviews…</p></div>;
  if (!reviewsList || reviewsList.length === 0) {
    return <div>{pageHeader}<p style={DS.emptyState}>No reviews yet.</p></div>;
  }

  const avg = reviewsList.reduce((s, r) => s + r.rating, 0) / reviewsList.length;

  return (
    <div>
      {pageHeader}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Star size={20} fill="#F5B400" color="#F5B400" />
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--op-text)' }}>{avg.toFixed(1)}</span>
        <span style={{ fontSize: 14, color: 'var(--op-text-secondary)' }}>across {reviewsList.length} reviews</span>
      </div>
      {reviewsList.map((r) => (
        <div key={r.id} style={{
          background: 'var(--op-card-bg)',
          borderRadius: 'var(--op-radius-card)',
          padding: 16,
          border: '1px solid var(--op-card-border)',
          boxShadow: 'var(--op-shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14}
                  fill={i <= r.rating ? '#F5B400' : '#D1D1D1'}
                  color={i <= r.rating ? '#F5B400' : '#D1D1D1'} />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.customerName}</span>
            <span style={{ fontSize: 12, color: 'var(--op-text-secondary)', marginLeft: 'auto' }}>
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </div>
          {r.comment && (
            <p style={{ fontSize: 14, color: 'var(--op-text-secondary)', margin: 0 }}>{r.comment}</p>
          )}
          {(r as any).ownerReply ? (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(24,24,24,0.04)', border: '1px solid rgba(24,24,24,0.08)', borderRadius: 6 }}>
              <span style={{ fontSize: '0.5625rem', fontFamily: 'Geist Mono', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--op-text-secondary)', display: 'block', marginBottom: 4 }}>Owner reply:</span>
              <p style={{ fontSize: 13, color: 'var(--op-text)', margin: 0 }}>{(r as any).ownerReply}</p>
            </div>
          ) : (
            <ReviewReplyForm
              reviewId={r.id}
              onSuccess={() => utils.venue.listReviews.invalidate()}
            />
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
