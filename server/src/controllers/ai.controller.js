const { testGeminConnection, 
        generateInterviewPlan,
} = require("../services/ai.service");

const testAI = async (req, res)  => {
    try{
        const result = await testGeminConnection();

        return res.status(200).json({
            message : " Gemini connection sucessful",
            result,
        });
    }
    catch(error) {
        console.error("AI test Error : ", error);

        return res.status(500).json({
            message : "Gemini connection failed"
        });

    }
};

const testInterviewPlan = async(req,res) => {
    try{
        const{
            role,
            difficulty,
            jobDescription,
            resumeText,
        } = req.body;

        const plan = await generateInterviewPlan({
            role,
            difficulty,
            jobDescription,
            resumeText,
        });

        return res.status(200).json({
            message : "Interview plan generated sucessfully",
            plan,
        });
    }
    catch(error) {
        console.error("Interview plan Test Error:",error);

        return res.status(500).json({
            meesage:  "Interview plan generation failed"
        });
    }
};



module.exports = {
    testAI,
    testInterviewPlan,
};

