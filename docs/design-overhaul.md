# Zmadora Design Overhaul

เอกสารนี้เป็นแผนรื้อ visual design และ interaction design ของ Zmadora ใหม่ทั้งระบบ โดยเน้นให้แอปดูสะอาด อ่านง่าย ใช้งานเร็ว และมี visual identity ที่ชัดเจนบนมือถือ แท็บเล็ต และเดสก์ท็อป

สถานะ: Draft สำหรับใช้เป็น design/implementation brief

## 1. ปัญหาของดีไซน์ปัจจุบัน

### 1.1 Visual hierarchy ไม่ชัด

องค์ประกอบหลายส่วนพยายามดึงความสนใจพร้อมกัน ทั้ง gradient, glass effect, blur, border, shadow และ badge สีสด ทำให้ผู้ใช้ไม่รู้ว่าควรมองอะไรเป็นอันดับแรก

ลำดับความสำคัญใหม่ควรเป็น:

1. เนื้อหาโพสต์และ media
2. ผู้เขียนโพสต์และเวลาที่โพสต์
3. action สำคัญ เช่น like, comment, repost, bookmark
4. navigation และ utility actions

### 1.2 Design language ยังไม่เป็นชุดเดียวกัน

ปัจจุบันมีทั้งปุ่มทรง pill, rounded rectangle, icon-only และ card แบบ glass ปะปนกัน โดยไม่มี rule ที่ชัดเจนว่าแต่ละรูปแบบใช้เมื่อใด

ระบบใหม่จะกำหนดบทบาทให้ชัดเจน:

- ปุ่มหลัก: rounded-md ไม่ใช้ pill ทุกจุด
- ปุ่ม icon: ใช้เฉพาะ action ที่ผู้ใช้คุ้นเคยและมี tooltip/aria-label
- Card: ใช้สำหรับ grouping เนื้อหาที่จำเป็น ไม่ใช้เพื่อห่อทุก section
- Pill: ใช้กับ status, filter, count และ tag เท่านั้น

### 1.3 Responsive ยังเป็นการซ่อน/แสดงมากกว่าการออกแบบตามบริบท

มือถือไม่ควรเป็น desktop ที่ถูกบีบให้แคบลง แต่ควรมี task flow ของตัวเอง เช่น อ่าน feed, สร้างโพสต์, เปิด chat และดูแจ้งเตือน โดยใช้มือเดียวและมีระยะกดที่เพียงพอ

## 2. Design direction ใหม่

### ชื่อ direction: Quiet Signal

แนวคิดคือให้ content เป็นพระเอก และใช้สี/เส้น/พื้นผิวเพียงพอให้ผู้ใช้รู้สถานะของระบบ โดยไม่ตกแต่งจนรบกวนการอ่าน

คุณลักษณะหลัก:

- พื้นผิวเรียบและโปร่งเล็กน้อย แทน glass หนาหลายชั้น
- ขอบบาง สีอ่อน และ shadow เบา
- ใช้สี accent เฉพาะ action ที่สำคัญ
- typography ใหญ่พอ อ่านง่าย และมี contrast สูง
- spacing เป็นระบบเดียวกันทั้งแอป
- motion สั้นและ subtle ไม่ใช้ animation เพื่อประดับเฉย ๆ

ภาพรวมที่ต้องการ: สงบ, ทันสมัย, editorial, เชื่อถือได้ และ content-first

## 3. Design tokens

ควรย้ายค่าด้านล่างไปไว้ใน `globals.css` และใช้ผ่าน semantic class/utility แทนการเขียนค่าสีสุ่มใน component

### 3.1 Color

#### Light theme

```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 30% 12%;
  --surface: 0 0% 100%;
  --surface-subtle: 210 18% 96%;
  --surface-hover: 210 18% 93%;
  --border: 214 18% 88%;
  --muted-foreground: 215 12% 42%;

  --primary: 222 75% 52%;
  --primary-hover: 222 75% 45%;
  --primary-foreground: 0 0% 100%;

  --success: 154 58% 38%;
  --warning: 30 85% 46%;
  --danger: 0 68% 52%;
}
```

#### Dark theme

```css
.dark {
  --background: 222 28% 8%;
  --foreground: 210 20% 96%;
  --surface: 222 25% 11%;
  --surface-subtle: 222 22% 15%;
  --surface-hover: 222 22% 19%;
  --border: 220 18% 23%;
  --muted-foreground: 215 12% 66%;

  --primary: 222 85% 67%;
  --primary-hover: 222 85% 74%;
  --primary-foreground: 222 35% 10%;
}
```

#### Color rules

- ห้ามใช้ gradient เป็น background หลักของ page
- ใช้ gradient ได้เฉพาะ brand mark หรือ decorative accent ขนาดเล็ก
- ห้ามใช้ `white/10` เป็นค่า default ของ interaction เพราะ contrast ไม่คงที่ระหว่าง theme
- badge แจ้งเตือนใช้ danger หรือ primary ตามความหมาย ไม่ใช้สีฟ้ากับทุกประเภท
- text หลักต้องมี contrast อย่างน้อย WCAG AA

### 3.2 Spacing

ใช้ spacing scale เดียว:

| Token | ค่า | การใช้งาน |
|---|---:|---|
| `space-1` | 4px | icon กับ label |
| `space-2` | 8px | gap ระหว่าง controls |
| `space-3` | 12px | metadata, compact row |
| `space-4` | 16px | padding มาตรฐาน |
| `space-5` | 20px | card section |
| `space-6` | 24px | section หลัก |
| `space-8` | 32px | page section |
| `space-10` | 40px | separation ขนาดใหญ่ |

กฎสำคัญ: component ใหม่ไม่ควรใช้ค่า arbitrary เช่น `17px`, `23px` หรือ `28px` ถ้าไม่มีเหตุผลด้าน visual alignment

### 3.3 Radius

```text
sm  = 8px   input, compact button
md  = 12px  card, dropdown, image preview
lg  = 16px  modal, post media, major panel
full = 9999px avatar, status, badge
```

เลิกใช้ radius ใหญ่ระดับ 24–28px กับทุก element เพราะทำให้ทุกอย่างดูเหมือน floating bubble และลดความชัดของโครงสร้าง

### 3.4 Shadow และ surface

ใช้ shadow เพียง 3 ระดับ:

```text
shadow-sm:  0 1px 2px rgba(15, 23, 42, .06)
shadow-md:  0 8px 24px rgba(15, 23, 42, .10)
shadow-lg:  0 18px 45px rgba(15, 23, 42, .16)
```

`glass-panel` ควรลดบทบาทเหลือ surface utility เดียว:

- background: surface ที่มี opacity เล็กน้อย
- border: 1px solid border
- backdrop blur: ใช้เฉพาะ fixed header/bottom nav
- ห้ามใช้ blur กับทุก card ใน feed

## 4. Typography

### Font roles

- UI/body: Inter หรือ Geist Sans
- username/technical metadata: ใช้ font เดียวกับ body ที่น้ำหนักเบา ไม่ต้องใช้ monospace ทุกจุด
- brand: ใช้ font display/mono ได้เฉพาะ logo

### Type scale

| Role | Size / line-height | Weight |
|---|---|---:|
| Page title | 24/32 | 700 |
| Section title | 18/26 | 650 |
| Post author | 15/22 | 650 |
| Post body | 15/24 | 400 |
| Supporting text | 13/20 | 400 |
| Caption | 12/18 | 400 |
| Button | 14/20 | 600 |

บนมือถือ post body ไม่ควรต่ำกว่า 15px และ metadata ไม่ควรต่ำกว่า 12px

## 5. Layout architecture

### 5.1 Desktop: 1280px ขึ้นไป

```text
┌──────────────┬───────────────────────────┬──────────────┐
│ Sidebar      │ Main content              │ Chat rail    │
│ 240–260px    │ 640–720px                 │ 320–380px    │
└──────────────┴───────────────────────────┴──────────────┘
```

- sidebar width คงที่ 240–260px
- main content มี `max-width: 680px`
- chat rail เปิด/ปิดได้และจำ width ล่าสุด
- page container ไม่ควรขยายจน post กว้างเกินไป
- sidebar sticky แต่เนื้อหาด้านใน scroll ได้

### 5.2 Tablet: 768–1279px

- ซ่อน sidebar ถาวร
- ใช้ top navigation แบบ compact
- main content `max-width: 720px`
- chat เปิดเป็น full-screen sheet หรือ side sheet ไม่แทรก grid หลัก
- horizontal padding: 20–32px
- หลีกเลี่ยงการแสดง label ของ nav ทุกปุ่มพร้อมกัน ถ้าพื้นที่ไม่พอ

### 5.3 Mobile: ต่ำกว่า 768px

- top bar สูง 56px
- bottom navigation สูง 64px + safe area
- content padding 16px
- post card ใช้ surface เดียวกับ page ได้ ไม่ต้องมีกรอบซ้อนหลายชั้น
- FAB ต้องอยู่เหนือ bottom nav อย่างน้อย 16px
- chat ใช้ full-screen modal/sheet
- modal bottom sheet ต้องมี `max-height: 92dvh` และ scroll ภายใน

### 5.4 Safe area

ใช้ `dvh` และ safe area ให้ครบ:

```css
.mobile-bottom-bar {
  min-height: 64px;
  padding-bottom: env(safe-area-inset-bottom);
}

.mobile-screen {
  min-height: 100dvh;
}
```

## 6. Navigation redesign

### Desktop sidebar

ลำดับ:

1. Logo
2. Home
3. Search
4. Notifications
5. Profile
6. Settings
7. User account block ด้านล่าง

ข้อกำหนด:

- active item มีพื้นหลัง surface-hover และแถบ accent เล็ก ๆ ด้านซ้าย
- icon ทุกตัวขนาด 20px
- label ขนาด 14–15px
- ปุ่ม navigation กว้างเต็ม column และสูงอย่างน้อย 44px
- tooltip ใช้เฉพาะ collapsed sidebar

### Tablet top bar

- ซ้าย: logo หรือ back button ตาม context
- กลาง: page title เฉพาะหน้าที่จำเป็น
- ขวา: theme, notification, avatar
- ใช้ `gap-1` หรือ `gap-2` และซ่อน text label

### Mobile bottom nav

แนะนำ 5 slots:

```text
Home | Search | Create | Notifications | Profile
```

Messages ให้เข้าผ่าน notification หรือ avatar menu หรือเพิ่มเป็น slotที่ 6 เฉพาะเมื่อ chat เป็น core feature จริง ๆ

เหตุผล: ปุ่ม create ควรอยู่ใน navigation flow เดียวกับ action หลัก ไม่ควรมี FAB ซ้อนกับ bottom nav ตลอดเวลา ถ้าใช้ FAB ให้แสดงเฉพาะหน้า feed และไม่บัง content

## 7. Component redesign

### 7.1 Button

Variants ที่ควรเหลือ:

- `primary`: action หลักหนึ่งปุ่มต่อ section
- `secondary`: action รอง
- `outline`: action ที่ต้องการขอบเขตชัด
- `ghost`: toolbar/navigation
- `danger`: delete, destructive action

กฎ:

- ทุก button มี visible label หรือ `aria-label`
- icon-only button ต้องขนาดอย่างน้อย 40×40px บน desktop และ 44×44px บน touch device
- ปุ่ม submit ต้องมี loading state และไม่เปลี่ยนขนาดจน layout กระโดด
- ปุ่ม disabled ต้องยังอ่าน label ได้ ไม่ใช้ opacity ต่ำจนหาย
- ปุ่ม link ไม่ควรซ้อน `button` กับ `a` แบบผิด semantics

### 7.2 Post card

โครงสร้างใหม่:

```text
PostCard
├── PostHeader
│   ├── Avatar
│   ├── Author name + verified/status
│   ├── Username + time
│   └── More menu
├── PostContent
│   ├── Text
│   └── Media
├── PostStats (ถ้ามี)
└── PostActions
    ├── Comment
    ├── Like
    ├── Repost
    └── Bookmark
```

กฎ visual:

- header และ action ใช้ padding 16px
- text ใช้ line-height 1.6
- media เต็มความกว้างของ content และมี radius 12px
- action row ไม่ใช้สีสดจนกว่าจะ active
- like ใช้ rose เฉพาะเมื่อ active, repost ใช้ emerald, bookmark ใช้ amber
- count ต้องอยู่ใกล้ icon และไม่เปลี่ยน layout เมื่อเป็น 0/1/100+

### 7.3 Create post

- desktop: inline composer ด้านบน feed
- mobile: bottom sheet หรือ inline composer ที่เปิดด้วย Create
- textarea ต้องมี focus state ที่ชัด
- ปุ่ม Photo ใช้ icon + label บน desktop, icon-only พร้อม tooltip บน mobile
- preview image มี remove button ที่ขนาด touch-friendly
- หลัง publish สำเร็จให้ปิด sheet/clear draft และ focus กลับไป feed
- ถ้ามี unsaved content ตอนปิด sheet ต้องถามหรือเก็บ draft

### 7.4 Notifications

- notification trigger แสดง unread badge เฉพาะเมื่อมี unread
- dropdown มี max-height และ scroll เฉพาะรายการ
- notification item ไม่ควรซ้อน interactive button หลายชั้น
- click item ต้องมี destination ที่ชัดเจน
- message notification เปิด chat พร้อม select contact
- mark-as-read ต้อง optimistic ได้ แต่มี rollback เมื่อ request fail

### 7.5 Chat

Desktop:

- contacts column กว้าง 260–300px
- conversation column ยืดหยุ่น
- resize handle มี hit area อย่างน้อย 12px แต่ visual แสดงเพียง 1px

Mobile/tablet:

- เปิดเป็น full-screen sheet
- แสดง contacts หรือ conversation อย่างใดอย่างหนึ่งต่อครั้ง
- back button ต้องชัดและใช้ browser back ได้ถ้า flow รองรับ
- input bar ต้องไม่ถูก keyboard บัง
- call buttons ต้องมี tooltip/aria-label และ confirmation สำหรับ end call

## 8. Interaction และ motion

### Timing

```text
fast:   120ms  hover, color
normal: 180ms  button, dropdown
slow:   240ms  sheet, modal
```

ใช้ `ease-out` ตอนเปิด และ `ease-in` ตอนปิด

### ห้ามทำ

- animate ทุก card ตอนโหลด
- ใช้ hover effect ที่เปลี่ยน layout
- ใช้ scale ใหญ่จน content กระโดด
- ใช้ animation ที่ทำให้ action สำคัญช้าลง

รองรับ `prefers-reduced-motion: reduce` โดยปิด transition และ animation ที่ไม่จำเป็น

## 9. Accessibility requirements

- body text และ interactive text ต้องผ่าน contrast WCAG AA
- keyboard focus ต้องเห็นชัดทุกปุ่ม, link, input, menu item
- icon-only control ทุกตัวมี `aria-label`
- ใช้ `button` สำหรับ action และ `a` สำหรับ navigation
- dialog/sheet ต้องมี title และ close control
- notification badge ไม่ควรเป็นข้อมูลเดียวที่บอก unread; เพิ่ม accessible text เช่น `3 unread notifications`
- touch target ขั้นต่ำ 44×44px
- focus ต้องไม่ถูก fixed header หรือ bottom nav บัง
- images ต้องมี alt ที่สื่อความหมาย หรือ alt ว่างสำหรับ decorative image

## 10. Responsive acceptance matrix

| Test | Mobile 360px | Tablet 768px | Tablet 1024px | Desktop 1440px |
|---|---|---|---|---|
| ไม่มี horizontal overflow | ผ่าน | ผ่าน | ผ่าน | ผ่าน |
| navbar ไม่ชนกัน | ผ่าน | ผ่าน | ผ่าน | ผ่าน |
| bottom nav แสดง | แสดง | ไม่แสดง | ไม่แสดง | ไม่แสดง |
| sidebar แสดง | ไม่แสดง | ไม่แสดง | แสดงแบบ compact/ตาม design | แสดงเต็ม |
| chat เปิดแล้วไม่ทำให้ page ล้น | full-screen | sheet | sheet | rail |
| composer ใช้งานด้วย keyboard | ผ่าน | ผ่าน | ผ่าน | ผ่าน |
| button touch target | 44px+ | 44px+ | 40px+ | 40px+ |
| dropdown ไม่ล้น viewport | ผ่าน | ผ่าน | ผ่าน | ผ่าน |

## 11. File/component strategy

แนะนำโครงสร้างใหม่:

```text
src/components/
├── design-system/
│   ├── Button.tsx
│   ├── IconButton.tsx
│   ├── Surface.tsx
│   ├── Badge.tsx
│   └── EmptyState.tsx
├── layout/
│   ├── AppHeader.tsx
│   ├── DesktopSidebar.tsx
│   ├── MobileBottomNav.tsx
│   └── ResponsiveChatShell.tsx
├── feed/
│   ├── PostCard/
│   │   ├── PostCard.tsx
│   │   ├── PostHeader.tsx
│   │   ├── PostActions.tsx
│   │   └── PostMedia.tsx
│   └── CreatePost/
└── notifications/
    ├── NotificationTrigger.tsx
    ├── NotificationList.tsx
    └── NotificationItem.tsx
```

เป้าหมายคือแยก layout, primitive และ domain component ออกจากกัน เพื่อลด class string ยาว ๆ และทำให้ responsive rule อยู่ใน component ที่รับผิดชอบโดยตรง

## 12. Migration plan

### Phase 1: Foundation

1. เพิ่ม semantic color tokens
2. ลด/ย้าย glass styles
3. จัด typography และ spacing scale
4. ปรับ Button, IconButton และ Surface ให้เป็น shared primitives
5. เพิ่ม global focus และ reduced-motion rules

### Phase 2: Shell

1. รื้อ Navbar, Sidebar และ BottomNav
2. กำหนด breakpoint behavior ใหม่
3. แก้ fixed overlay และ safe area
4. ทำ chat shell ให้แยก desktop rail กับ mobile sheet

### Phase 3: Feed

1. รื้อ PostCard hierarchy
2. ทำ action row ให้สม่ำเสมอ
3. ปรับ CreatePost และ image preview
4. เพิ่ม empty/loading/error state ที่อยู่ใน visual system เดียวกัน

### Phase 4: Secondary surfaces

1. notification dropdown/page
2. profile header และ friends list
3. settings tabs/forms
4. call modal และ incoming call state

### Phase 5: QA และ cleanup

1. ลบ utility/class ที่ไม่ได้ใช้
2. แก้ component ที่มี logic ซ้ำ
3. ตรวจ keyboard navigation
4. ตรวจ viewport matrix
5. ตรวจ light/dark theme
6. ตรวจ loading, empty, error และ network failure state

## 13. Definition of done

ดีไซน์ overhaul ถือว่าเสร็จเมื่อ:

- ทุกหน้ามี spacing, radius, typography และ color language เดียวกัน
- ไม่มี horizontal overflow ที่ 320px, 360px, 768px, 1024px และ 1440px
- ไม่มี icon-only button ที่ไม่มี accessible label
- ไม่มี route/link ที่กดแล้วไปหน้าที่ไม่มีอยู่
- feed content เด่นกว่า decorative background
- mobile ใช้งานด้วยมือเดียวได้
- chat, notification, composer และ modal ไม่ถูก keyboard หรือ safe area บัง
- dark/light theme มี contrast ที่อ่านได้จริง
- `git diff --check`, typecheck และ production build ผ่าน
- component สำคัญผ่าน manual interaction test อย่างน้อย: open/close, submit, loading, error, retry และ keyboard focus

## 14. ลำดับที่ควรลงมือจริง

ถ้าต้องเลือกทำเป็นลำดับเดียว ให้ทำตามนี้:

1. รื้อ global tokens และลบ background decoration ที่รบกวน
2. ทำ Button, Surface, Input และ IconButton ให้เป็นมาตรฐาน
3. รื้อ app shell และ breakpoint behavior
4. รื้อ PostCard เพราะเป็นพื้นที่ที่ผู้ใช้เห็นมากที่สุด
5. รื้อ composer และ action states
6. ปรับ notification/chat
7. ปรับ profile/settings
8. ทำ accessibility และ responsive QA รอบสุดท้าย

หลักการตัดสินใจระหว่างทำ: ถ้าการตกแต่งทำให้ผู้ใช้เห็น content ยากขึ้น ให้ตัดการตกแต่งนั้นก่อนเสมอ
