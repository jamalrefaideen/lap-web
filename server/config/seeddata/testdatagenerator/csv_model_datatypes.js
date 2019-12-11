
var CONSTANTS = require("../../../api/dataconstants/constants");
var ModelDataTypes = CONSTANTS.ModelDataTypes;

module.exports.ModelDataTypes = {
    "school.csv":{
        'mongooseModel':require("./../../../api/school/school.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID
        }
    },

    "academicyear.csv":{
        'mongooseModel':require("./../../../api/academicyear/academicyear.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "fromDate":ModelDataTypes.OBJECT_ID,
            "toDate":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "klass.csv":{
        'mongooseModel':require("./../../../api/klass/klass.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "klass_section.csv":{
        'mongooseModel':require("./../../../api/klasssection/klasssection.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "klassId":ModelDataTypes.OBJECT_ID,
            "staffId":ModelDataTypes.OBJECT_ID
        }
    },

    "subject_type.csv":{
        'mongooseModel':require("./../../../api/subjecttype/subjecttype.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "klass_section_subject.csv":{
        'mongooseModel':require("./../../../api/klasssectionsubject/klasssectionsubject.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "staffId":ModelDataTypes.OBJECT_ID,
            "klassSectionId":ModelDataTypes.OBJECT_ID,
            "subjectTypeId":ModelDataTypes.OBJECT_ID,
            "academicYearId":ModelDataTypes.OBJECT_ID
        }
    },

    "klass_section_student.csv":{
        'mongooseModel':require("./../../../api/klasssectionstudent/klasssectionstudent.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "klassId":ModelDataTypes.OBJECT_ID,
            "klassSectionId":ModelDataTypes.OBJECT_ID,
            "studentId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "academicYearId":ModelDataTypes.OBJECT_ID
        }
    },

    "klassperiod1.csv":{
        'mongooseModel':require("./../../../api/klassperiod/klassperiod.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "klassSectionId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "academicYearId":ModelDataTypes.OBJECT_ID
        }
    },

    "timetable1.csv":{
        'mongooseModel':require("./../../../api/timetable/timetable.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "klassPeriodId":ModelDataTypes.OBJECT_ID,
            "klassSectionSubjectId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "academicYearId":ModelDataTypes.OBJECT_ID
        }
    },

    "student_attendence.csv":{
        'mongooseModel':require("./../../../api/studentattendance/studentattendance.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "studentId":ModelDataTypes.OBJECT_ID,
            "klassSectionId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "schoolCalendarId":ModelDataTypes.OBJECT_ID,
        }
    },

    "late_arrival.csv":{
        'mongooseModel':require("./../../../api/latearrival/latearrival.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "studentId":ModelDataTypes.OBJECT_ID,
            "klassSectionId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "schoolCalendarId":ModelDataTypes.OBJECT_ID,
        }
    },

    "exam_type.csv":{
        'mongooseModel':require("./../../../api/examtype/examtype.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "academicYearId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

     "resultgrade.csv":{
        'mongooseModel':require("./../../../api/resultgrade/resultgrade.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID
        }
    },

    "exam.csv":{
        'mongooseModel':require("./../../../api/exam/exam.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "examTypeId":ModelDataTypes.OBJECT_ID,
            "klassSectionId":ModelDataTypes.OBJECT_ID,
            "klassSectionSubjectId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "schoolCalendarId":ModelDataTypes.OBJECT_ID,
        }
    },

    "student_mark.csv":{
        'mongooseModel':require("./../../../api/studentmark/studentmark.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "examId":ModelDataTypes.OBJECT_ID,
            "klassSectionSubjectId":ModelDataTypes.OBJECT_ID,
            "studentId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "resultGradeId":ModelDataTypes.OBJECT_ID
        }
    },

    "student_result.csv":{
        'mongooseModel':require("./../../../api/studentresult/studentresult.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "examTypeId":ModelDataTypes.OBJECT_ID,
            "studentId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID,
            "academicYearId":ModelDataTypes.OBJECT_ID
        }
    },

    "behavioural_score.csv":{
        'mongooseModel':require("./../../../api/behaviouralscore/behaviouralscore.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "behaviour_attribute.csv":{
        'mongooseModel':require("./../../../api/behaviouralattribute/behaviouralattribute.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "studentbehaviour.csv":{
        'mongooseModel':require("./../../../api/studentbehaviour/studentbehaviour.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "klassSectionStudentId":ModelDataTypes.OBJECT_ID,
            "behaviouralScoreId":ModelDataTypes.OBJECT_ID,
            "behaviouralAttributeId":ModelDataTypes.OBJECT_ID,
            "schoolCalendarId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "diary.csv":{
        'mongooseModel':require("./../../../api/diary/diary.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolCalendarId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "diarytargetinstance.csv":{
        'mongooseModel':require("./../../../api/diarytargetinstance/diarytargetinstance.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "diaryId":ModelDataTypes.OBJECT_ID,
            "studentId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    },

    "event.csv":{
        'mongooseModel':require("./../../../api/event/event.model"),
        'attributeTypeMapper':{
            "_id":ModelDataTypes.OBJECT_ID,
            "schoolCalendarId":ModelDataTypes.OBJECT_ID,
            "schoolId":ModelDataTypes.OBJECT_ID
        }
    }

};
