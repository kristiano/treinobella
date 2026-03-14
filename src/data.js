export const WORKOUTS = {
    A: {
        id: "A", name: "Treino A", target: "Peito, Bíceps e Tríceps",
        rest: "45-60s", color: "#3B82F6", icon: "💪",
        exercises: [
            { id: "a1", name: "Pack Deck", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7540467729162194181" },
            { id: "a2", name: "Supino Reto", sets: 3, reps: "10-12", video: null },
            { id: "a3", name: "Rosca Direta", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7528550322386521350" },
            { id: "a4", name: "Rosca Martelo", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@aline_cintra_/video/7248638704246459654" },
            { id: "a5", name: "Tríceps Pulley Alto", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7507754584706682118" },
            { id: "a6", name: "Tríceps com Halter", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7578326580351601941" },
            { id: "a7", name: "Tríceps Máquina", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7559360262306860344" },
        ],
    },
    B: {
        id: "B", name: "Treino B", target: "Glúteos e Posterior de Coxa",
        rest: "60-90s", color: "#A855F7", icon: "🍑",
        exercises: [
            { id: "b1", name: "Cadeira Abdutora", sets: 4, reps: "12-15", video: "https://www.instagram.com/reel/DNg9ZtMtOCG/" },
            { id: "b2", name: "Cadeira Flexora", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@keilaamelia.personal/video/7435652591130037559" },
            { id: "b3", name: "Stiff Romeno", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7511061621222018360" },
            { id: "b4", name: "Agachamento Sumô", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7534838728171261240" },
            { id: "b5", name: "Elevação Pélvica", sets: 4, reps: "10-15", video: "https://www.tiktok.com/@jessicabevilaquaa/video/7544809192776027398" },
            { id: "b6", name: "Glúteo na Polia", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7497365291257679159" },
            { id: "b7", name: "Hack Machine", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@taymila_mila/video/7278445462774975750" },
        ],
    },
    C: {
        id: "C", name: "Treino C", target: "Costa e Ombro",
        rest: "45-60s", color: "#10B981", icon: "🏋️",
        exercises: [
            { id: "c1", name: "Puxada na Máquina", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7569018453063961877" },
            { id: "c2", name: "Remada Baixa", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7566418233012604181" },
            { id: "c3", name: "Graviton", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7563421573676322068" },
            { id: "c4", name: "Pullover na Polia", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@marianasmosca/video/7284347308408376581" },
            { id: "c5", name: "Ombros Halteres", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7549299284936609030" },
            { id: "c6", name: "Elevação Lateral", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@taymila_mila/video/7469551493578820869" },
            { id: "c7", name: "Face Pull na Polia", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@petrythalia/video/7519257556594789637" },
            { id: "c8", name: "Elevação Lateral na Polia", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@vanessabaldi.personal/video/7417479494111333638" },
            { id: "c9", name: "Desenvolvimento Sentado", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@nagatapersonal/video/7577531026897980690" },
        ],
    },
    D: {
        id: "D", name: "Treino D", target: "Quadríceps e Glúteo",
        rest: "60-90s", color: "#FF6B6B", icon: "🦵",
        exercises: [
            { id: "d1", name: "Leg Press 45°", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@raquelbenattipersonal/video/7542333780313247032" },
            { id: "d2", name: "Hack Machine", sets: 3, reps: "10-12", video: "https://www.tiktok.com/@taymila_mila/video/7278445462774975750" },
            { id: "d3", name: "Cadeira Extensora", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@personal.zead/video/7475493328608349445" },
            { id: "d4", name: "Máquina Glúteo", sets: 3, reps: "12-15", video: "https://www.tiktok.com/@personal_andreterto/video/7353340088539041030" },
        ],
    },
};

export const SCHEDULE = [
    { day: "Segunda", workout: "A" }, { day: "Terça", workout: "B" },
    { day: "Quarta", workout: "C" }, { day: "Quinta", workout: "D" },
    { day: "Sexta", workout: null }, { day: "Sábado", workout: null },
    { day: "Domingo", workout: null },
];
