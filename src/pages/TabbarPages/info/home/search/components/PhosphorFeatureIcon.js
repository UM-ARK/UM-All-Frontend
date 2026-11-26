import React from 'react';
import { AddressBook } from 'phosphor-react-native/src/icons/AddressBook';
import { Alarm } from 'phosphor-react-native/src/icons/Alarm';
import { Anchor } from 'phosphor-react-native/src/icons/Anchor';
import { AppWindow } from 'phosphor-react-native/src/icons/AppWindow';
import { ArrowsLeftRight } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import { Bank } from 'phosphor-react-native/src/icons/Bank';
import { Barbell } from 'phosphor-react-native/src/icons/Barbell';
import { Basketball } from 'phosphor-react-native/src/icons/Basketball';
import { BookBookmark } from 'phosphor-react-native/src/icons/BookBookmark';
import { BookOpenText } from 'phosphor-react-native/src/icons/BookOpenText';
import { Briefcase } from 'phosphor-react-native/src/icons/Briefcase';
import { BuildingApartment } from 'phosphor-react-native/src/icons/BuildingApartment';
import { BuildingOffice } from 'phosphor-react-native/src/icons/BuildingOffice';
import { Bus } from 'phosphor-react-native/src/icons/Bus';
import { Calculator } from 'phosphor-react-native/src/icons/Calculator';
import { CalendarCheck } from 'phosphor-react-native/src/icons/CalendarCheck';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { Camera } from 'phosphor-react-native/src/icons/Camera';
import { CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUp } from 'phosphor-react-native/src/icons/CaretUp';
import { ChatCircleDots } from 'phosphor-react-native/src/icons/ChatCircleDots';
import { ChatsCircle } from 'phosphor-react-native/src/icons/ChatsCircle';
import { ClipboardText } from 'phosphor-react-native/src/icons/ClipboardText';
import { Clock } from 'phosphor-react-native/src/icons/Clock';
import { ClockCounterClockwise } from 'phosphor-react-native/src/icons/ClockCounterClockwise';
import { Code } from 'phosphor-react-native/src/icons/Code';
import { Compass } from 'phosphor-react-native/src/icons/Compass';
import { Cpu } from 'phosphor-react-native/src/icons/Cpu';
import { Desktop } from 'phosphor-react-native/src/icons/Desktop';
import { ForkKnife } from 'phosphor-react-native/src/icons/ForkKnife';
import { Gear } from 'phosphor-react-native/src/icons/Gear';
import { GlobeHemisphereWest } from 'phosphor-react-native/src/icons/GlobeHemisphereWest';
import { GraduationCap } from 'phosphor-react-native/src/icons/GraduationCap';
import { Hamburger } from 'phosphor-react-native/src/icons/Hamburger';
import { HandHeart } from 'phosphor-react-native/src/icons/HandHeart';
import { HouseLine } from 'phosphor-react-native/src/icons/HouseLine';
import { IdentificationCard } from 'phosphor-react-native/src/icons/IdentificationCard';
import { Images } from 'phosphor-react-native/src/icons/Images';
import { Kanban } from 'phosphor-react-native/src/icons/Kanban';
import { LetterCircleP } from 'phosphor-react-native/src/icons/LetterCircleP';
import { Lockers } from 'phosphor-react-native/src/icons/Lockers';
import { MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MagnifyingGlassPlus } from 'phosphor-react-native/src/icons/MagnifyingGlassPlus';
import { MapTrifold } from 'phosphor-react-native/src/icons/MapTrifold';
import { Medal } from 'phosphor-react-native/src/icons/Medal';
import { Megaphone } from 'phosphor-react-native/src/icons/Megaphone';
import { Package } from 'phosphor-react-native/src/icons/Package';
import { Printer } from 'phosphor-react-native/src/icons/Printer';
import { ProjectorScreen } from 'phosphor-react-native/src/icons/ProjectorScreen';
import { Question } from 'phosphor-react-native/src/icons/Question';
import { SealCheck } from 'phosphor-react-native/src/icons/SealCheck';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { Shuffle } from 'phosphor-react-native/src/icons/Shuffle';
import { Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import { SuitcaseRolling } from 'phosphor-react-native/src/icons/SuitcaseRolling';
import { Table } from 'phosphor-react-native/src/icons/Table';
import { Ticket } from 'phosphor-react-native/src/icons/Ticket';
import { Trophy } from 'phosphor-react-native/src/icons/Trophy';
import { UserCheck } from 'phosphor-react-native/src/icons/UserCheck';
import { UsersThree } from 'phosphor-react-native/src/icons/UsersThree';
import { Wallet } from 'phosphor-react-native/src/icons/Wallet';
import { Wrench } from 'phosphor-react-native/src/icons/Wrench';
import { Bell } from 'phosphor-react-native/src/icons/Bell';
import { BookmarkSimple } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { NotePencil } from 'phosphor-react-native/src/icons/NotePencil';
import { PlusCircle } from 'phosphor-react-native/src/icons/PlusCircle';
import { Pulse } from 'phosphor-react-native/src/icons/Pulse';
import { UserCircle } from 'phosphor-react-native/src/icons/UserCircle';
import { UserPlus } from 'phosphor-react-native/src/icons/UserPlus';

// 靜態按需匯入 Phosphor Duotone 圖標（線性描邊＋輕量雙色填底），兼顧層次感與打包體積
export const phosphorFeatureIcons = {
    // 出行
    bus: Bus,
    map: MapTrifold,
    parking: LetterCircleP,
    ticket: Ticket,

    // 餐飲
    utensils: ForkKnife,
    burger: Hamburger,
    clock: Clock,

    // 學習空間
    'projector-screen': ProjectorScreen,
    desktop: Desktop,
    'book-open': BookOpenText,
    'calendar-check': CalendarCheck,

    // 學業與選課
    'graduation-cap': GraduationCap,
    'app-window': AppWindow,
    sparkles: Sparkle,
    'search-sparkle': MagnifyingGlassPlus,
    kanban: Kanban,
    'clipboard-check': ClipboardText,
    'file-spreadsheet': Table,
    'arrow-left-right': ArrowsLeftRight,
    calendar: CalendarDots,
    'alarm-clock': Alarm,
    search: MagnifyingGlass,
    notebook: BookBookmark,
    award: Medal,
    globe: GlobeHemisphereWest,
    trophy: Trophy,

    // 設施與預約
    dumbbell: Barbell,
    basketball: Basketball,
    building: BuildingApartment,
    printer: Printer,
    wallet: Wallet,
    wrench: Wrench,
    'filing-cabinet': Lockers,
    'badge-verified': SealCheck,
    passport: IdentificationCard,
    users: UsersThree,
    'message-circle': ChatCircleDots,

    // 校務與資訊
    megaphone: Megaphone,
    package: Package,
    briefcase: Briefcase,
    landmark: Bank,
    'building-office': BuildingOffice,
    home: HouseLine,
    'messages-square': ChatsCircle,
    grid: SquaresFour,

    // 新生與社群指南
    'user-check': UserCheck,
    images: Images,
    compass: Compass,
    luggage: SuitcaseRolling,
    shield: ShieldCheck,
    anchor: Anchor,
    'contact-book': AddressBook,

    // 首頁快捷入口
    'hand-heart': HandHeart,
    'help-circle': Question,

    // 我的
    envelope: EnvelopeSimple,
    bookmark: BookmarkSimple,
    heart: Heart,
    note: NotePencil,
    'user-circle': UserCircle,
    bell: Bell,
    pulse: Pulse,
    'plus-circle': PlusCircle,
    'user-plus': UserPlus,

    // ARK Wiki
    shuffle: Shuffle,
    'clock-counter-clockwise': ClockCounterClockwise,
    'caret-right': CaretRight,
    'caret-down': CaretDown,
    'caret-up': CaretUp,
    code: Code,
    gear: Gear,
    camera: Camera,
    cpu: Cpu,
    calculator: Calculator,
};

export default function PhosphorFeatureIcon({
    name,
    size,
    color,
    weight = 'duotone',
}) {
    const IconComponent = phosphorFeatureIcons[name] || SquaresFour;
    return (
        <IconComponent
            size={size}
            color={color}
            weight={weight}
        />
    );
}
