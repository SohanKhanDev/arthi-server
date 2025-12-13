require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);

const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
// middleware
app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    req.tokenEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).send("Unauthorized Access!", err);
  }
};

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const db = client.db("arthi_DB");
    const usersCollection = db.collection("users");
    const loansCollection = db.collection("loans");
    const loanApplicationsCollection = db.collection("loanApplications");
    const paymentReceivedCollection = db.collection("paymentReceived");
    const testtimonialsCollection = db.collection("testtimonials");

    const verifyRole = (allowedRoles) => async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await usersCollection.findOne({ email });

      if (!user || !allowedRoles.includes(user?.role)) {
        return res.status(403).send({
          message: `${allowedRoles.join("/")} Only Action`,
          role: user?.role,
        });
      }
      next();
    };

    app.get("/testtimonials", async (req, res) => {
      try {
        const result = await testtimonialsCollection.find().toArray();

        res.send(result);
      } catch (error) {
        console.error("Testimonials fetch error:", error);
        res.status(500).send("Failed to fetch testimonials");
      }
    });

    // dashborad statistics
    app.get("/dashboard/stats", verifyJWT, async (req, res) => {
      try {
        const userEmail = req.tokenEmail;
        const user = await usersCollection.findOne({ email: userEmail });
        const role = user?.role;

        if (role === "admin") {
          const totalUsers = await usersCollection.countDocuments();
          const totalLoans = await loansCollection.countDocuments();
          const totalApplications =
            await loanApplicationsCollection.countDocuments();
          const pendingApps = await loanApplicationsCollection.countDocuments({
            status: "pending",
          });
          const approvedApps = await loanApplicationsCollection.countDocuments({
            status: "approved",
          });
          const rejectedApps = await loanApplicationsCollection.countDocuments({
            status: "rejected",
          });
          res.send({
            totalUsers,
            totalLoans,
            totalApplications,
            pendingApps,
            approvedApps,
            rejectedApps,
          });
        }

        if (role === "manager") {
          const totalLoans = await loansCollection.countDocuments();
          const totalApplications =
            await loanApplicationsCollection.countDocuments();
          const pendingApps = await loanApplicationsCollection.countDocuments({
            status: "pending",
          });
          const approvedApps = await loanApplicationsCollection.countDocuments({
            status: "approved",
          });
          const rejectedApps = await loanApplicationsCollection.countDocuments({
            status: "rejected",
          });
          res.send({
            totalLoans,
            totalApplications,
            pendingApps,
            approvedApps,
            rejectedApps,
          });
        }

        if (role === "borrower") {
          const totalApplications =
            await loanApplicationsCollection.countDocuments({
              requestBy: userEmail,
            });
          const pendingApps = await loanApplicationsCollection.countDocuments({
            status: "pending",
            requestBy: userEmail,
          });
          const approvedApps = await loanApplicationsCollection.countDocuments({
            status: "approved",
            requestBy: userEmail,
          });
          const rejectedApps = await loanApplicationsCollection.countDocuments({
            status: "rejected",
            requestBy: userEmail,
          });
          res.send({
            totalApplications,
            pendingApps,
            approvedApps,
            rejectedApps,
          });
        }
      } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).send({ error: "Failed to fetch stats" });
      }
    });

    // dashborad charts
    app.get(
      "/dashboard/admin/charts",
      verifyJWT,
      verifyRole(["admin", "manager"]),
      async (req, res) => {
        try {
          const pipeline = [
            {
              $group: {
                _id: "$title",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                title: "$_id",
                count: 1,
                _id: 0,
              },
            },
            {
              $sort: { count: -1 },
            },
          ];

          const result = await loanApplicationsCollection
            .aggregate(pipeline)
            .toArray();
          res.send(result);
        } catch (error) {
          console.error("Chart data error:", error);
          res.status(500).send({ error: "Data fetch failed" });
        }
      }
    );

    // add loans application
    app.post(
      "/apply-loan",
      verifyJWT,
      verifyRole(["borrower"]),
      async (req, res) => {
        try {
          const rcvData = req.body;
          const {
            title,
            interestRate,
            category,
            loanId,
            first_name,
            last_name,
            address,
            contact_no,
            nid_no,
            income_source,
            monthly_income,
            loan_amount,
            loan_reason,
            notes,
            requestBy,
          } = rcvData;

          const applicationData = {
            title,
            interestRate: parseFloat(interestRate),
            category,
            loanId,
            first_name,
            last_name,
            address,
            contact_no,
            nid_no,
            income_source,
            monthly_income: parseFloat(monthly_income),
            loan_amount: parseFloat(loan_amount),
            loan_reason,
            notes,
            status: "pending",
            fee_status: "unpaid",
            requestBy,
            createdAt: new Date(),
          };
          const result = await loanApplicationsCollection.insertOne(
            applicationData
          );
          res.send(result);
        } catch (error) {
          console.error("Loan application post error:", error);
          res.status(500).send("Failed to post loan application");
        }
      }
    );

    // get loans application by requestBy
    app.get(
      "/loan-applications",
      verifyJWT,
      verifyRole(["borrower"]),
      async (req, res) => {
        try {
          const rcvData = req.tokenEmail;
          const result = await loanApplicationsCollection
            .find({ requestBy: rcvData })
            .toArray();
          res.send(result);
        } catch (error) {
          console.error("Loan data error:", error);
          res.status(500).send({ error: "Data fetch failed" });
        }
      }
    );

    // get pending application by requestBy
    app.get(
      "/pending-applications",
      verifyJWT,
      verifyRole(["manager"]),
      async (req, res) => {
        try {
          const filter = { status: "pending" };
          const result = await loanApplicationsCollection
            .find(filter)
            .toArray();
          res.send(result);
        } catch (error) {
          console.error("Pending applicaiton data error:", error);
          res.status(500).send({ error: "Data fetch failed" });
        }
      }
    );

    // get approve application by requestBy
    app.get(
      "/approved-applications",
      verifyJWT,
      verifyRole(["manager"]),
      async (req, res) => {
        try {
          const filter = { status: "approved" };
          const result = await loanApplicationsCollection
            .find(filter)
            .toArray();
          res.send(result);
        } catch (error) {
          console.error("Approved applicaiton data error:", error);
          res.status(500).send({ error: "Data fetch failed" });
        }
      }
    );

    // get all application
    app.get(
      "/all-applications",
      verifyJWT,
      verifyRole(["admin"]),
      async (req, res) => {
        try {
          const result = await loanApplicationsCollection.find().toArray();
          res.send(result);
        } catch (error) {
          console.error("All applicaitons data error:", error);
          res.status(500).send({ error: "Data fetch failed" });
        }
      }
    );

    // update application status by requestBy
    app.patch("/application/:id", verifyJWT, async (req, res) => {
      try {
        const rcvData = req.params.id;
        const appID = new ObjectId(rcvData);
        const statusRcv = req.body.status;
        const result = await loanApplicationsCollection.updateOne(
          { _id: appID },
          {
            $set: {
              status: statusRcv,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Applicaitons patch data error:", error);
        res.status(500).send({ error: "Data patch failed" });
      }
    });

    // add loans
    app.post(
      "/addloans",
      verifyJWT,
      verifyRole(["admin", "manager"]),
      async (req, res) => {
        try {
          const rcvData = req.body;
          const {
            title,
            description,
            category,
            interestRate,
            maxLoanLimit,
            requiredDocuments,
            emiPlans,
            showOnHome,
            image,
          } = rcvData;

          const loanData = {
            title,
            description,
            category,
            interestRate: parseFloat(interestRate),
            maxLoanLimit: parseFloat(maxLoanLimit),
            requiredDocuments,
            emiPlans: parseFloat(emiPlans),
            showOnHome,
            image,
            createdAt: new Date(),
          };

          const result = await loansCollection.insertOne(loanData);
          res.send(result);
        } catch (error) {
          console.error("Loan post error:", error);
          res.status(500).send("Failed to post loan");
        }
      }
    );

    // delete loans
    app.delete(
      "/loans/:id",
      verifyJWT,
      verifyRole(["admin", "manager"]),
      async (req, res) => {
        try {
          const rcvData = req.params.id;
          const deleteID = new ObjectId(rcvData);
          const result = await loansCollection.deleteOne({ _id: deleteID });
          res.send(result);
        } catch (error) {
          console.error("Loan delete error:", error);
          res.status(500).send("Failed to delete loan");
        }
      }
    );

    // update loans
    app.patch(
      "/loans/:id",
      verifyJWT,
      verifyRole(["admin", "manager"]),
      async (req, res) => {
        try {
          const rcvID = req.params.id;
          const updateID = new ObjectId(rcvID);

          const rcvData = req.body;

          const result = await loansCollection.updateOne(
            { _id: updateID },
            { $set: rcvData }
          );
          res.send(result);
        } catch (error) {
          console.error("Loan update error:", error);
          res.status(500).send("Failed to update loan");
        }
      }
    );

    // update appllication home display
    app.patch(
      "/loanHomeDisply/:id",
      verifyJWT,
      verifyRole(["admin"]),
      async (req, res) => {
        try {
          const loanId = new ObjectId(req.params.id);
          const { showOnHome } = req.body;

          const result = await loansCollection.updateOne(
            { _id: loanId },
            { $set: { showOnHome } }
          );
          res.json(result);
        } catch (error) {
          console.error("Loan update error:", error);
          res.status(500).send("Failed to update loan");
        }
      }
    );

    // pay application fee
    app.post(
      "/application-fee",
      verifyJWT,
      verifyRole(["borrower"]),
      async (req, res) => {
        try {
          const rcvData = req.body;
          const appId = new ObjectId(rcvData?.applicationID);
          const applicationDetails = await loanApplicationsCollection.findOne({
            _id: appId,
          });

          const applicantEmail = rcvData?.applicant?.email;

          const session = await stripe.checkout.sessions.create({
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: `${applicationDetails?.title} fee`,
                  },
                  unit_amount: 1000,
                },
                quantity: 1,
              },
            ],
            customer_email: applicantEmail,
            mode: "payment",
            metadata: {
              applicationID: rcvData?.applicationID,
            },
            success_url: `${process.env.CLIENT_URL}/dashboard/loan-applications/sucess-payment?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/dashboard/my-loans/${applicantEmail}`,
          });

          res.send({ url: session.url });
        } catch (error) {
          console.error("Loan post error:", error);
          res.status(500).send("Failed to post loan");
        }
      }
    );

    // payemt sucessful
    app.post(
      "/payment-success",
      verifyJWT,
      verifyRole(["borrower"]),
      async (req, res) => {
        try {
          const { sessionId } = req.body;

          if (!sessionId) {
            return res.status(400).json({ error: "Session ID required" });
          }

          const session = await stripe.checkout.sessions.retrieve(sessionId);

          if (session.status !== "complete") {
            return res.status(400).json({ error: "Payment not completed" });
          }

          const appID = session.metadata?.applicationID;
          if (!appID) {
            return res
              .status(400)
              .json({ error: "Application ID not found in metadata" });
          }

          const application = await loanApplicationsCollection.findOne({
            _id: new ObjectId(appID),
          });

          if (!application) {
            return res.status(404).json({ error: "Application not found" });
          }

          const existingOrder = await paymentReceivedCollection.findOne({
            transactionId: session?.payment_intent,
          });

          if (existingOrder) {
            return res.json({
              success: true,
              transactionId: session?.payment_intent,
              orderId: existingOrder._id,
              message: "Payment already processed",
            });
          }

          const paymentInfo = {
            applicationID: appID,
            transactionId: session?.payment_intent,
            customer: session.customer_email,
            amount: session.amount_total / 100,
            paymentDate: new Date(),
            status: "completed",
          };

          const result = await paymentReceivedCollection.insertOne(paymentInfo);

          await loanApplicationsCollection.updateOne(
            { _id: new ObjectId(appID) },
            {
              $set: {
                fee_status: "paid",
                payment_date: new Date(),
                transactionId: paymentInfo.transactionId,
              },
            }
          );

          res.json({
            success: true,
            transactionId: session.payment_intent,
            orderId: result.insertedId,
            message: "Payment processed successfully",
          });
        } catch (error) {
          res.status(500).json({ error: "Payment processing failed" });
        }
      }
    );

    // payemt info
    app.get("/payment-info/:id", verifyJWT, async (req, res) => {
      try {
        const rcvData = req.params.id;

        const result = await paymentReceivedCollection.findOne({
          applicationID: rcvData,
        });
        res.send(result);
      } catch (error) {
        console.error("Payment info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // get all loans with pagination
    app.get("/loans", async (req, res) => {
      try {
        const { limit = 0, skip = 0 } = req.query;
        const result = await loansCollection
          .find()
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .toArray();
        const count = await loansCollection.countDocuments();
        res.send({ result, total: count });
      } catch (error) {
        console.error("Loan info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // get all loans
    app.get("/all-loans", async (req, res) => {
      try {
        const result = await loansCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Loan info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // get all loans for home pages
    app.get("/homepage-loans", async (req, res) => {
      try {
        const filter = { showOnHome: true };
        const result = await loansCollection.find(filter).limit(6).toArray();
        res.send(result);
      } catch (error) {
        console.error("Home Loan info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // get specific loan
    app.get("/loan/:id", verifyJWT, async (req, res) => {
      try {
        const rcvData = req.params.id;
        const userID = new ObjectId(rcvData);
        const result = await loansCollection.findOne({ _id: userID });
        res.send(result);
      } catch (error) {
        console.error("Loan info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // save or update user
    app.post(
      "/users",
      verifyJWT,
      verifyRole(["borrower"]),
      async (req, res) => {
        try {
          const userData = req.body;
          userData.createdAt = new Date().toISOString();
          userData.lastLoogedIn = new Date().toISOString();

          if (userData.role !== "borrower") {
            userData.status = "pending";
          } else {
            userData.status = "approved";
          }

          const filter = { email: userData.email };
          const alreadyExists = await usersCollection.findOne(filter);

          if (alreadyExists) {
            const result = await usersCollection.updateOne(filter, {
              $set: { lastLoogedIn: new Date().toISOString() },
            });
            return res.send(result);
          }

          const result = await usersCollection.insertOne(userData);
          res.send(result);
        } catch (error) {
          res.status(500).json({ error: "Payment processing failed" });
        }
      }
    );

    // get specific user
    app.get("/users/:email", verifyJWT, async (req, res) => {
      try {
        const userEmail = req.params.email;
        const result = await usersCollection.findOne({ email: userEmail });
        res.send(result);
      } catch (error) {
        console.error("User info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // get all user
    app.get("/users", verifyJWT, verifyRole(["admin"]), async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Users info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // get specific user
    app.get("/db-user", verifyJWT, async (req, res) => {
      try {
        const userEmail = req.tokenEmail;
        const result = await usersCollection.findOne({ email: userEmail });
        res.send(result);
      } catch (error) {
        console.error("Users info data error:", error);
        res.status(500).send({ error: "Data fetch failed" });
      }
    });

    // update user name & photo
    app.patch("/users-update", verifyJWT, async (req, res) => {
      try {
        const userData = req.body;
        const { name, image, email } = userData;
        const result = await usersCollection.updateOne(
          { email: email },
          {
            $set: {
              name: name,
              image: image,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).send("Failed to update profile");
      }
    });

    // update user last login time
    app.patch("/users/login-update/:id", verifyJWT, async (req, res) => {
      try {
        const userData = req.params.id;
        const userID = new ObjectId(userData);
        const result = await usersCollection.updateOne(
          { _id: userID },
          {
            $set: {
              lastLoogedIn: new Date().toISOString(),
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).send("Failed to update profile");
      }
    });

    // update user role
    app.patch(
      "/update-role",
      verifyJWT,
      verifyRole(["admin"]),
      async (req, res) => {
        try {
          const userData = req.body;
          const { email, role } = userData;

          const result = await usersCollection.updateOne(
            { email: email },
            {
              $set: {
                role: role,
              },
            }
          );
          res.send(result);
        } catch (error) {
          console.error("Profile update error:", error);
          res.status(500).send("Failed to update profile");
        }
      }
    );

    // update user status to suspend
    app.patch(
      "/users/suspend/:id",
      verifyJWT,
      verifyRole(["admin"]),
      async (req, res) => {
        try {
          const userData = req.params.id;
          const userID = new ObjectId(userData);
          const { suspendReason } = req.body;

          const result = await usersCollection.updateOne(
            { _id: userID },
            {
              $set: {
                status: "suspended",
                suspendReason: suspendReason,
              },
            }
          );
          res.send(result);
        } catch (error) {
          console.error("Profile update error:", error);
          res.status(500).send("Failed to update profile");
        }
      }
    );

    // update user status to approve
    app.patch(
      "/users/approve/:id",
      verifyJWT,
      verifyRole(["admin"]),
      async (req, res) => {
        try {
          const userData = req.params.id;
          const userID = new ObjectId(userData);
          const result = await usersCollection.updateOne(
            { _id: userID },
            {
              $set: {
                status: "approved",
              },
            }
          );
          res.send(result);
        } catch (error) {
          console.error("Profile update error:", error);
          res.status(500).send("Failed to update profile");
        }
      }
    );

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Arthi Server is Running!! 🚀");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
